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

export function convertTimestamp(input: string): ToolResult<string> {
  const unit = detectUnit(input)
  let date: Date
  let realSeconds: number
  let realMillis: number
  if (unit === 'date') {
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
  } else {
    return { status: 'error', kind: 'invalid-input', message: '仅接受时间戳或日期字符串' }
  }
  if (Number.isNaN(date.getTime())) return { status: 'error', kind: 'invalid-input', message: '数值超出可表示范围' }
  const unitLabel = { s: '秒 (s)', ms: '毫秒 (ms)', us: '微秒 (us)', date: '日期串 (date)' }[unit]
  return {
    status: 'ok',
    data: [
      `检测精度:${unitLabel}`,
      `ISO:${date.toISOString()}`,
      `本地时间:${fmtLocal(date)}`,
      `UTC 时间:${fmtUtc(date)}`,
      `Unix 秒:${realSeconds}`,
      `Unix 毫秒:${Math.round(realMillis)}`
    ].join('\n')
  }
}
