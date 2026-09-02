import type { ToolResult } from '@core/types'
import type { LogAnalysisResult, LevelStat, ExceptionCluster, IdHit, EndpointAgg, TimelinePoint } from './types'

const LVLS = ['FATAL', 'ERROR', 'WARN', 'INFO', 'DEBUG', 'TRACE']
const timeRe = /(\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:[.,]\d+)?)/
const traceRe = /(?:trace[Ii]d|traceId|trace_id|tid)\s*[=:]\s*([\w-]+)/
const reqRe = /(?:requestId|request_id|reqId|reqid|rid)\s*[=:]\s*([\w-]+)/
const ipRe = /\b(\d{1,3}(?:\.\d{1,3}){3})\b/
const exceptRe = /([A-Za-z_][\w$]*(?:Exception|Error|Throwable))(?::\s*(.*))?/
const pathRe = /(?:GET|POST|PUT|DELETE|PATCH)\s+(\/[A-Za-z0-9_\-./{}]*)/i

export function splitContextLines(rawText: string, lineIndex: number, n = 3): string[] {
  const lines = rawText.split(/\r?\n/)
  const start = Math.max(0, lineIndex - n), end = Math.min(lines.length, lineIndex + n + 1)
  return lines.slice(start, end)
}

export function analyzeLog(rawText: string): ToolResult<LogAnalysisResult> {
  // Truncate BEFORE splitting/analyzing so we never materialize a huge array only
  // to discard it. The >50MB case returns a genuine partial analysis (status 'ok',
  // data over the truncated slice) rather than a data-less error.
  let text = rawText
  if (text.length > 50 * 1024 * 1024) text = text.slice(0, 50 * 1024 * 1024)

  const rawLines = text.split(/\r?\n/)
  // Track each analyzed (non-blank) line's ORIGINAL index into the raw split, so
  // `sampleLine` stays consistent with `splitContextLines` (which slices the raw
  // split — blank lines must not shift the reported context window).
  const lines: Array<{ text: string; originalIndex: number }> = []
  rawLines.forEach((l, i) => { if (l.trim() !== '') lines.push({ text: l, originalIndex: i }) })
  if (lines.length === 0) return { status: 'error', kind: 'invalid-input', message: '日志为空' }

  const levelCount: Record<string, number> = {}
  const levelLines: Record<string, number[]> = {}
  const timeline = new Map<string, number>()
  const traceLines = new Map<string, number[]>()
  const reqLines = new Map<string, number[]>()
  const ipLines = new Map<string, number[]>()
  const excByHash = new Map<string, ExceptionCluster>()
  const pathErrors = new Map<string, Map<string, number>>()
  const kwCount = new Map<string, number>()

  lines.forEach((entry, idx) => {
    const line = entry.text
    const lineNo = entry.originalIndex
    // level
    let level = 'INFO'
    const upper = line.toUpperCase()
    for (const lv of LVLS) {
      if (new RegExp(`\\b${lv}\\b`).test(upper)) { level = lv; break }
    }
    levelCount[level] = (levelCount[level] ?? 0) + 1
    ;(levelLines[level] ??= []).push(idx)
    // timeline (minute bucket)
    const tm = line.match(timeRe)
    if (tm) { const min = tm[1].slice(0, 16); timeline.set(min, (timeline.get(min) ?? 0) + 1) }
    // ids
    const tr = line.match(traceRe); if (tr) { const arr = traceLines.get(tr[1]) ?? []; arr.push(idx); traceLines.set(tr[1], arr) }
    const rq = line.match(reqRe); if (rq) { const arr = reqLines.get(rq[1]) ?? []; arr.push(idx); reqLines.set(rq[1], arr) }
    const ip = line.match(ipRe); if (ip) { const arr = ipLines.get(ip[1]) ?? []; arr.push(idx); ipLines.set(ip[1], arr) }
    // exception
    const ex = line.match(exceptRe)
    if (ex) {
      const type = ex[1], msg = ex[2] ?? ''
      // Cluster by exception type only, so all occurrences of the SAME exception
      // (header line + its stack-continuation lines) merge into ONE cluster.
      const key = type
      const desc = exceptionLineMessage(line, msg)
      let cur = excByHash.get(key)
      if (!cur) {
        cur = { type, message: desc, count: 0, sampleLine: lineNo, stackHash: hash(key) }
        excByHash.set(key, cur)
      } else if (desc && cur.message === '') {
        cur.message = desc
      }
      cur.count += 1
    }
    // endpoint
    const pe = line.match(pathRe)
    if (pe && (level === 'ERROR' || level === 'FATAL')) {
      const path = pe[1]
      const m = pathErrors.get(path) ?? new Map<string, number>()
      const exType = ex ? ex[1] : 'ERROR'
      m.set(exType, (m.get(exType) ?? 0) + 1)
      pathErrors.set(path, m)
    }
    // keywords from error lines
    if (level === 'ERROR' || level === 'FATAL') {
      const words = line.replace(/[^\p{L}\p{N}]/gu, ' ').split(/\s+/).filter((w) => w.length >= 4)
      for (const w of words) kwCount.set(w, (kwCount.get(w) ?? 0) + 1)
    }
  })

  const total = lines.length
  const levelStats: LevelStat[] = LVLS.filter((l) => levelCount[l])
    .map((l) => ({ level: l, count: levelCount[l], pct: Math.round((levelCount[l] / total) * 100) }))
  const toIdHits = (m: Map<string, number[]>): IdHit[] => [...m.entries()]
    .map(([id, arr]) => ({ id, lineCount: arr.length })).sort((a, b) => b.lineCount - a.lineCount)
  const exceptions = [...excByHash.values()].sort((a, b) => b.count - a.count)
  const keywords = [...kwCount.entries()]
    .map(([word, count]) => ({ word, count })).sort((a, b) => b.count - a.count).slice(0, 20)
  const endpoints: EndpointAgg[] = [...pathErrors.entries()]
    .map(([path, m]) => ({ path, errors: [...m.entries()].map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count) }))
  const timelineArr: TimelinePoint[] = [...timeline.entries()]
    .map(([ts, count]) => ({ ts, count })).sort((a, b) => a.ts.localeCompare(b.ts))

  return {
    status: 'ok',
    data: {
      totalLines: total, levelStats, timeline: timelineArr, exceptions, keywords,
      traceIds: toIdHits(traceLines), requestIds: toIdHits(reqLines), ips: toIdHits(ipLines), endpoints
    }
  }
}

// Extract a short human-readable descriptor for an exception occurrence.
// Prefer the offending frame (e.g. `OrderService.getOrder`); fall back to the
// message after the exception type (`: ...`), or the empty string.
function exceptionLineMessage(line: string, msg: string): string {
  const frame = line.match(/\bat ([\w.]+(?:\.[A-Za-z_$][\w$]*)+(?:\([^)]*\))?)/)
  if (frame) return frame[1]
  return msg.trim()
}

function hash(s: string): string {
  let h = 0
  for (let i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) | 0 }
  return h.toString(36)
}
