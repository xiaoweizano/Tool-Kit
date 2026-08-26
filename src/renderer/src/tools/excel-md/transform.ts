import type { ToolResult } from '@core/types'

export function sheetToMarkdown(aoa: unknown[][]): ToolResult<string> {
  if (!aoa || aoa.length === 0) return { status: 'error', kind: 'invalid-input', message: '工作表为空' }
  const cols = Math.max(...aoa.map((r) => r.length))
  if (cols === 0) return { status: 'error', kind: 'invalid-input', message: '工作表无列' }
  const fmt = (v: unknown): string => {
    if (v === null || v === undefined) return ''
    // 单元格内换行(\r\n/\n/\r)折叠为空格,保证表格每行单行有效;竖线由 esc 转义,不用引号包裹
    return String(v).replace(/\r\n/g, '\n').replace(/[\n\r]+/g, ' ')
  }
  const esc = (c: string): string => c.replace(/\|/g, '\\|')
  const rows = aoa.map((row) => {
    const cells = Array.from({ length: cols }, (_, i) => (i < row.length ? esc(fmt(row[i])) : ''))
    return `| ${cells.join(' | ')} |`
  })
  const sep = '|' + Array(cols).fill('---').join('|') + '|'
  return { status: 'ok', data: [rows[0], sep, ...rows.slice(1)].join('\n') }
}

export function markdownToSheet(md: string): ToolResult<unknown[][]> {
  const lines = md.split('\n').filter((l) => l.trim().includes('|'))
  if (lines.length < 2) return { status: 'error', kind: 'invalid-input', message: '未识别到 Markdown 表格(至少表头+分隔行)' }
  const split = (line: string): string[] =>
    line.trim().replace(/^\||\|$/g, '').split('|').map((s) => s.trim())
  const first = split(lines[0])
  // 跳过分隔行 ---
  const rows: string[][] = []
  for (let i = 1; i < lines.length; i++) {
    const cells = split(lines[i])
    if (cells.every((c) => /^:?-+:?$/.test(c))) continue
    rows.push(cells)
  }
  if (rows.length === 0) return { status: 'error', kind: 'invalid-input', message: '表格没有数据行(只有表头与分隔行)' }
  const all = [first, ...rows]
  const cols = first.length
  for (const r of all) if (r.length !== cols)
    return { status: 'error', kind: 'invalid-input', message: `列数不一致(${all.indexOf(r) + 1} 行,期望 ${cols} 列,实际 ${r.length})`, position: all.indexOf(r) }
  return { status: 'ok', data: all.map((r) => r.map((c) => c.replace(/\\\|/g, '|'))) }
}
