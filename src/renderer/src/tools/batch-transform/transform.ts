import type { ToolResult } from '@core/types'

export type OperationId =
  | 'wrap-squote' | 'wrap-dquote' | 'wrap-backtick' | 'wrap-paren' | 'wrap-bracket'
  | 'affix' | 'strip-special' | 'truncate' | 'trim' | 'drop-empty'
  | 'dedupe' | 'sort-dict' | 'sort-num' | 'upper' | 'lower'
  | 'width-normalize' | 'numbering' | 'url-encode' | 'b64-encode' | 'b64-decode'

export interface Operation { id: OperationId; params?: Record<string, string | number> }

// 混合解析:先按行再按中英逗号,trim;空串保留(由 drop-empty 决定去留)
export function parseInput(raw: string): string[] {
  return raw.split('\n').flatMap((line) => line.split(/[,，]/)).map((s) => s.trim())
}

const escRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&')

export function applyOperation(values: string[], op: Operation): string[] {
  const p = op.params ?? {}
  switch (op.id) {
    case 'wrap-squote': return values.map((v) => `'${v}'`)
    case 'wrap-dquote': return values.map((v) => `"${v}"`)
    case 'wrap-backtick': return values.map((v) => `\`${v}\``)
    case 'wrap-paren': return values.map((v) => `(${v})`)
    case 'wrap-bracket': return values.map((v) => `[${v}]`)
    case 'affix': {
      const pre = String(p.prefix ?? ''), suf = String(p.suffix ?? '')
      return values.map((v) => pre + v + suf)
    }
    case 'strip-special': {
      const keep = String(p.keep ?? '')
      const re = new RegExp(`[^\\w\\u4e00-\\u9fa5${escRe(keep)}]`, 'g')
      return values.map((v) => v.replace(re, ''))
    }
    case 'truncate': {
      const n = Number(p.len ?? 0)
      return String(p.from) === 'end' ? values.map((v) => v.slice(-n)) : values.map((v) => v.slice(0, n))
    }
    case 'trim': return values.map((v) => v.trim())
    case 'drop-empty': return values.filter((v) => v !== '')
    case 'dedupe': {
      const seen = new Set<string>()
      return values.filter((v) => (seen.has(v) ? false : (seen.add(v), true)))
    }
    case 'sort-dict': return [...values].sort((a, b) => a.localeCompare(b))
    case 'sort-num': return [...values].sort((a, b) => (Number(a) - Number(b)) || a.localeCompare(b))
    case 'upper': return values.map((v) => v.toUpperCase())
    case 'lower': return values.map((v) => v.toLowerCase())
    case 'width-normalize': return values.map((v) => v.replace(/[！-～]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0)).replace(/　/g, ' '))
    case 'numbering': {
      const sep = String(p.sep ?? '. ')
      return values.map((v, i) => `${i + 1}${sep}${v}`)
    }
    case 'url-encode': return values.map((v) => encodeURIComponent(v))
    case 'b64-encode': return values.map((v) => btoa(String.fromCharCode(...new TextEncoder().encode(v))))
    case 'b64-decode': return values.map((v) => new TextDecoder().decode(Uint8Array.from(atob(v), (c) => c.charCodeAt(0))))
  }
}

export type OutputFormat = 'comma' | 'json' | 'sql-in' | 'newline' | 'custom'

export function formatOutput(values: string[], format: OutputFormat, customSep = ''): string {
  switch (format) {
    case 'comma': return values.join(', ')
    case 'json': return JSON.stringify(values)
    case 'sql-in': return `(${values.join(', ')})`
    case 'newline': return values.join('\n')
    case 'custom': return values.join(customSep)
  }
}

export function batchTransform(input: { raw: string; opsJson: string; format: string; customSep: string }): ToolResult<string> {
  if (!input.raw.trim()) return { status: 'error', kind: 'invalid-input', message: '输入为空' }
  let ops: Operation[]
  try { ops = JSON.parse(input.opsJson || '[]') as Operation[] } catch { return { status: 'error', kind: 'invalid-input', message: '操作列表解析失败' } }
  const values = ops.reduce<string[]>((acc, op) => applyOperation(acc, op), parseInput(input.raw))
  const format = (['comma', 'json', 'sql-in', 'newline', 'custom'] as const).includes(input.format as OutputFormat)
    ? (input.format as OutputFormat) : 'comma'
  return { status: 'ok', data: formatOutput(values, format, input.customSep) }
}
