import type { ToolResult } from '@core/types'

export type Unit = 's' | 'ms' | 'us' | 'date' | 'unknown'

export function detectUnit(input: string): Unit {
  const t = input.trim()
  if (!t) return 'unknown'
  if (/^\d+$/.test(t)) {
    if (t.length <= 10) return 's'
    if (t.length <= 13) return 'ms'
    return 'us'
  }
  if (!Number.isNaN(Date.parse(t))) return 'date'
  return 'unknown'
}

export function dateStrToUnix(dateStr: string): number {
  return Math.floor(new Date(dateStr).getTime() / 1000)
}

function pad2(n: number): string { return String(n).padStart(2, '0') }
function fmtLocal(d: Date): string {
  return `${d.getFullYear()}/${pad2(d.getMonth() + 1)}/${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
}
function fmtUtc(d: Date): string {
  return `${d.getUTCFullYear()}/${pad2(d.getUTCMonth() + 1)}/${pad2(d.getUTCDate())} ${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())}`
}

export interface TimestampOpts { format?: string }

// ---- 自定义格式(Java/dayjs 风格子集:yyyy yy MM M dd d HH H mm m ss s SSS) ----
const TOKEN_LIST = ['yyyy', 'SSS', 'yy', 'MM', 'dd', 'HH', 'mm', 'ss', 'M', 'd', 'H', 'm', 's']
const TOKEN_RE = new RegExp(`(${TOKEN_LIST.join('|')})`, 'g')

export function formatDate(d: Date, pattern: string): string {
  let out = ''
  let last = 0
  TOKEN_RE.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = TOKEN_RE.exec(pattern)) !== null) {
    out += pattern.slice(last, m.index)
    const p2 = (n: number): string => String(n).padStart(2, '0')
    switch (m[0]) {
      case 'yyyy': out += String(d.getFullYear()).padStart(4, '0'); break
      case 'yy': out += p2(d.getFullYear() % 100); break
      case 'MM': out += p2(d.getMonth() + 1); break
      case 'M': out += String(d.getMonth() + 1); break
      case 'dd': out += p2(d.getDate()); break
      case 'd': out += String(d.getDate()); break
      case 'HH': out += p2(d.getHours()); break
      case 'H': out += String(d.getHours()); break
      case 'mm': out += p2(d.getMinutes()); break
      case 'm': out += String(d.getMinutes()); break
      case 'ss': out += p2(d.getSeconds()); break
      case 's': out += String(d.getSeconds()); break
      case 'SSS': out += String(d.getMilliseconds()).padStart(3, '0'); break
    }
    last = m.index + m[0].length
  }
  return out + pattern.slice(last)
}

export function parseWithFormat(text: string, pattern: string): Date | null {
  const widths: Record<string, string> = {
    yyyy: '(\\d{4})', yy: '(\\d{2})', SSS: '(\\d{1,3})',
    MM: '(\\d{1,2})', M: '(\\d{1,2})', dd: '(\\d{1,2})', d: '(\\d{1,2})',
    HH: '(\\d{1,2})', H: '(\\d{1,2})', mm: '(\\d{1,2})', m: '(\\d{1,2})', ss: '(\\d{1,2})', s: '(\\d{1,2})'
  }
  let re = ''
  const order: string[] = []
  let i = 0
  while (i < pattern.length) {
    const tok = TOKEN_LIST.find((t) => pattern.startsWith(t, i))
    if (tok) { re += widths[tok]; order.push(tok); i += tok.length }
    else { re += pattern[i].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); i++ }
  }
  const m = new RegExp(`^${re}$`).exec(text.trim())
  if (!m) return null
  const c: Record<string, number> = {}
  order.forEach((t, idx) => { c[t] = Number(m[idx + 1]) })
  const year = c.yyyy ?? (c.yy !== undefined ? 2000 + c.yy : new Date().getFullYear())
  const month = c.MM ?? c.M ?? 1
  const day = c.dd ?? c.d ?? 1
  const hour = c.HH ?? c.H ?? 0
  const min = c.mm ?? c.m ?? 0
  const sec = c.ss ?? c.s ?? 0
  const ms = c.SSS ?? 0
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || min > 59 || sec > 59)
    return null
  const d = new Date(year, month - 1, day, hour, min, sec, ms)
  // 归一化校验:2 月 30 等会被 Date 滚动到下月,视为非法
  if (d.getMonth() !== month - 1 || d.getDate() !== day) return null
  return d
}

export function convertTimestamp(input: string, opts?: TimestampOpts): ToolResult<string> {
  const fmt = opts?.format?.trim() || undefined
  const unit = detectUnit(input)
  let date: Date
  let realSeconds: number
  let realMillis: number
  let viaFmt = false
  // 给了自定义格式则优先按格式解析(20260826 这类纯数字会被秒检测抢占);失败回落常规识别
  const fmtDate = fmt ? parseWithFormat(input, fmt) : null
  if (fmtDate) {
    date = fmtDate
    realMillis = date.getTime()
    realSeconds = Math.floor(realMillis / 1000)
    viaFmt = true
  } else if (unit === 'date') {
    realMillis = new Date(input.trim()).getTime()
    if (Number.isNaN(realMillis)) return { status: 'error', kind: 'invalid-input', message: '无法识别的日期格式' }
    date = new Date(realMillis)
    realSeconds = Math.floor(realMillis / 1000)
  } else if (unit === 's' || unit === 'ms' || unit === 'us') {
    const num = Number(input.trim())
    const ms = unit === 's' ? num * 1000 : unit === 'ms' ? num : num / 1000
    realMillis = ms
    realSeconds = Math.floor(ms / 1000)
    date = new Date(ms)
  } else if (fmt) {
    return { status: 'error', kind: 'invalid-input', message: `无法按自定义格式「${fmt}」解析,也不是可识别的时间戳/日期串` }
  } else {
    return { status: 'error', kind: 'invalid-input', message: '仅接受时间戳或日期字符串' }
  }
  if (Number.isNaN(date.getTime())) return { status: 'error', kind: 'invalid-input', message: '数值超出可表示范围' }
  const unitLabel = viaFmt
    ? `自定义格式 (${fmt})`
    : ({ s: '秒 (s)', ms: '毫秒 (ms)', us: '微秒 (us)', date: '日期串 (date)' } as Record<'s' | 'ms' | 'us' | 'date', string>)[unit as 's' | 'ms' | 'us' | 'date']
  const lines = [
    `检测精度:${unitLabel}`,
    `ISO:${date.toISOString()}`,
    `本地时间:${fmtLocal(date)}`,
    `UTC 时间:${fmtUtc(date)}`,
    `Unix 秒:${realSeconds}`,
    `Unix 毫秒:${Math.round(realMillis)}`
  ]
  if (fmt) lines.push(`自定义格式:${formatDate(date, fmt)}`)
  return { status: 'ok', data: lines.join('\n') }
}
