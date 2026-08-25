import type { ToolResult } from '@core/types'

function literalize(v: string): string {
  const t = v.trim()
  if (t === 'true' || t === 'false' || t === 'null') return t
  if (/^-?\d+(\.\d+)?$/.test(t)) return t
  return `'${t.replace(/'/g, "''")}'`
}

export function fillPlaceholders(input: { sql: string; params: string[] }): ToolResult<string> {
  const { sql, params } = input
  const parts = sql.split('?')
  if (parts.length <= 1) return { status: 'ok', data: sql }
  const failed: number[] = []
  let out = parts[0]
  for (let i = 1; i < parts.length; i++) {
    const p = params[i - 1]
    if (p === undefined) { failed.push(i - 1); out += '?' + parts[i]; continue }
    out += literalize(p) + parts[i]
  }
  if (failed.length) return { status: 'error', kind: 'partial', message: '参数不足,部分 ? 未替换', failedItems: failed }
  return { status: 'ok', data: out }
}

export function autoFillDefaults(sql: string): string[] {
  const n = (sql.match(/\?/g) ?? []).length
  return Array.from({ length: n }, (_, i) => `'arg_${i + 1}'`)
}

export function unfillLiterals(sql: string): ToolResult<string> {
  // 字符串 'xx' → ?,数值 → ?;引号内若含转义单引号先折叠,避免误拆
  let out = sql
  out = out.replace(/'.*?'/g, '?')
  out = out.replace(/\b\d+(\.\d+)?\b/g, '?')
  return { status: 'ok', data: out }
}

export function formatSql(sql: string): ToolResult<string> {
  const trimmed = sql.replace(/\s+/g, ' ').trim()
  const withNl = trimmed
    .replace(/\b(select|from|where|and|or|insert|into|values|update|set|delete|join|on|group by|order by|limit|having)\b/gi, '\n$1')
  const upper = withNl.replace(/\b(select|from|where|and|or|insert|into|values|update|set|delete|join|on|group by|order by|limit|having)\b/gi, (kw) => kw.toUpperCase())
  const lines = upper.split('\n').map((l) => l.trim()).filter((l) => l.length)
  return { status: 'ok', data: lines.join('\n') }
}