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
  const lines = rawText.split(/\r?\n/).filter((l) => l.trim() !== '')
  if (lines.length === 0) return { status: 'error', kind: 'invalid-input', message: '日志为空' }
  if (rawText.length > 50 * 1024 * 1024) return { status: 'error', kind: 'partial', message: '文件过大,已截断前50MB分析' }

  const levelCount: Record<string, number> = {}
  const levelLines: Record<string, number[]> = {}
  const timeline = new Map<string, number>()
  const traceLines = new Map<string, number[]>()
  const reqLines = new Map<string, number[]>()
  const ipLines = new Map<string, number[]>()
  const excByHash = new Map<string, ExceptionCluster>()
  const pathErrors = new Map<string, Map<string, number>>()
  const kwCount = new Map<string, number>()

  lines.forEach((line, idx) => {
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
      const key = `${type}|${msg.split(' ').slice(0, 3).join(' ')}`.slice(0, 80)
      const cur = excByHash.get(key) ?? { type, message: msg, count: 0, sampleLine: idx, stackHash: hash(key) }
      cur.count += 1
      excByHash.set(key, cur)
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

function hash(s: string): string {
  let h = 0
  for (let i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) | 0 }
  return h.toString(36)
}
