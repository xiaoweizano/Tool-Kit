import type { ToolResult } from '@core/types'

export type IdType = 'uuid' | 'snowflake' | 'sequence' | 'shortcode'
const MAX_COUNT = 1000

// RFC 4122 v4:crypto 随机填充 + 版本/变体位
export function uuidV4(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  bytes[6] = (bytes[6] & 0x0f) | 0x40 // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80 // variant 10x
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

// 真 64 位雪花:41bit 毫秒时间戳 + 10bit worker + 12bit 序列;进程内单调自增保序
let lastMs = 0n
let sequence = 0n
const WORKER_ID = 1n
function snowflake(): bigint {
  const now = BigInt(Date.now()) & 0x1ffffffffffn // 41bit
  if (now === lastMs) sequence = (sequence + 1n) & 0xfffn
  else { lastMs = now; sequence = 0n }
  return ((now << 22n) | (WORKER_ID << 12n) | sequence) & 0x7fffffffffffffffn
}

// 序列:至少 2 个字符前缀才安全递增(测试用纯数字期望 '1','2')
let seqCounter = 0
function nextSeq(prefix: string): string { seqCounter += 1; return `${prefix}${seqCounter}` }

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
function shortCode(len: number): string {
  let s = ''
  for (let i = 0; i < len; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  return s
}

export function generateIds(
  type: IdType,
  count: number,
  opts?: { prefix?: string; sep?: string }
): ToolResult<string> {
  if (!Number.isInteger(count) || count <= 0 || count > MAX_COUNT)
    return { status: 'error', kind: 'invalid-input', message: `数量需为 1-${MAX_COUNT} 的整数` }
  const prefix = opts?.prefix ?? ''
  const sep = opts?.sep ?? '\n'
  const out: string[] = []
  for (let i = 0; i < count; i++) {
    if (type === 'uuid') out.push(uuidV4())
    else if (type === 'snowflake') out.push(snowflake().toString())
    else if (type === 'sequence') out.push(nextSeq(prefix))
    else out.push(prefix + shortCode(8))
  }
  return { status: 'ok', data: out.join(sep) }
}