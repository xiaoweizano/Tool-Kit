import type { ToolResult } from '@core/types'

interface Column { name: string; type: string }

// 按括号深度 0 的逗号切分(保证 enum('a','b')、varchar(64) 不被内层逗号破坏)
function splitTopLevel(s: string): string[] {
  const out: string[] = []
  let depth = 0; let cur = ''
  for (const ch of s) {
    if (ch === '(') depth++
    if (ch === ')') depth--
    if (ch === ',' && depth === 0) { out.push(cur); cur = '' } else cur += ch
  }
  if (cur.trim()) out.push(cur)
  return out
}

export function parseColumns(sql: string): { table: string; columns: Column[] } | null {
  const tableMatch = /create\s+table\s+(?:if\s+not\s+exists\s+)?[`"]?([\w]+)[`"]?\s*\(/i.exec(sql)
  if (!tableMatch) return null
  const table = tableMatch[1]
  const open = sql.indexOf('(')
  const close = sql.lastIndexOf(')')
  if (open === -1 || close <= open) return null
  const body = sql.slice(open + 1, close)
  const columns: Column[] = []
  for (const rawPart of splitTopLevel(body)) {
    const line = rawPart.trim()
    if (!line) continue
    if (/^(primary|unique|key|index|constraint|foreign|check)\b/i.test(line)) continue
    const m = /^[`"]?(\w+)[`"]?\s+(\w+(\([\w,'"\s]*\))?)/.exec(line)
    if (m) {
      // 仅大写类型关键字,保留 enum 值等字面量大小写
      const type = m[2].replace(/^\w+/, (w) => w.toUpperCase())
      columns.push({ name: m[1], type })
    }
  }
  if (columns.length === 0) return null
  return { table, columns }
}

export function parseCreateTable(sql: string): ToolResult<string> {
  const parsed = parseColumns(sql)
  if (!parsed) return { status: 'error', kind: 'invalid-input', message: '无法解析:需要合法的 CREATE TABLE 语句(含表名与至少一列)' }
  const lines = parsed.columns.map((c) => `  ${c.name} ${c.type}`)
  return { status: 'ok', data: [`表 ${parsed.table} · 共 ${parsed.columns.length} 列:`, ...lines].join('\n') }
}

// ---- 造数 ----
const SURNAMES = '王李张刘陈杨黄赵吴周徐孙马朱胡郭何高林罗郑梁谢宋唐许韩冯邓曹彭曾'
const GIVEN = '伟芳娜敏静丽强磊军洋勇艳杰娟涛明超秀兰霞平刚桂英华梅鑫波斌宇浩凯秀'
const WORDS = ['数据', '测试', '记录', '样例', '条目', '项目', '内容', '备注', '描述', '文本']
const pick = <T,>(arr: T[] | string): T | string => arr[Math.floor(Math.random() * arr.length)]
const ri = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min
const randStr = (n: number): string => Array.from({ length: n }, () => 'abcdefghijklmnopqrstuvwxyz0123456789'[ri(0, 35)]).join('')
const randDate = (): string => `${ri(2020, 2026)}-${String(ri(1, 12)).padStart(2, '0')}-${String(ri(1, 28)).padStart(2, '0')}`
const randTime = (): string => `${String(ri(0, 23)).padStart(2, '0')}:${String(ri(0, 59)).padStart(2, '0')}:${String(ri(0, 59)).padStart(2, '0')}`

function smartValue(col: string, type: string, rowIndex: number): string | null {
  const c = col.toLowerCase()
  if (c.includes('email')) return `'user${rowIndex + 1}@example.com'`
  if (c.includes('phone') || c.includes('mobile')) return `'1${ri(3, 9)}${String(ri(100000000, 999999999))}'`
  if (c.includes('url') || c.includes('link')) return `'https://example.com/path-${rowIndex + 1}'`
  if (c === 'id' || c.endsWith('_id')) {
    if (/INT|NUMBER/.test(type)) return String(rowIndex + 1)
    return `'${crypto.randomUUID()}'`
  }
  if (c.includes('name')) return `'${pick(SURNAMES)}${pick(GIVEN)}'`
  if (c.includes('address')) return `'测试路${ri(1, 999)}号'`
  if (c.includes('status') || c.includes('type')) return String(ri(0, 3))
  if (c.includes('created_at') || c.includes('updated_at') || c.includes('_time')) return `'${randDate()} ${randTime()}'`
  return null // 无智能命中,走类型造数
}

function typeValue(col: Column): string {
  const t = col.type
  const lenMatch = /\((\d+)/.exec(t)
  const len = lenMatch ? Number(lenMatch[1]) : 10
  const enumMatch = /ENUM\(([^)]*)\)/.exec(t)
  if (enumMatch) {
    const opts = enumMatch[1].split(',').map((s) => s.trim().replace(/^'|'$/g, ''))
    return `'${pick(opts)}'`
  }
  if (/TINYINT\(1\)|BOOLEAN|BOOL/.test(t)) return Math.random() < 0.5 ? 'true' : 'false'
  if (/BIGINT|INT|SMALLINT|INTEGER/.test(t)) return String(ri(1, 100000))
  if (/FLOAT|DOUBLE|DECIMAL|NUMERIC|REAL/.test(t)) return `${ri(1, 999)}.${ri(0, 99)}`
  if (/DATETIME|TIMESTAMP/.test(t)) return `'${randDate()} ${randTime()}'`
  if (/DATE/.test(t)) return `'${randDate()}'`
  if (/TIME/.test(t)) return `'${randTime()}'`
  if (/TEXT|JSON|BLOB/.test(t)) return `'${pick(WORDS)}${pick(WORDS)}${ri(1, 99)}'`
  // VARCHAR/CHAR 及未知类型
  return `'${randStr(Math.min(len, 12))}'`
}

function cellValue(col: Column, rowIndex: number, nullRate: number): string {
  if (nullRate > 0 && Math.random() < nullRate) return 'NULL'
  return smartValue(col.name, col.type, rowIndex) ?? typeValue(col)
}

export function genInserts(opts: { sql: string; rows: number; nullRate: number }): ToolResult<string> {
  const { sql, rows, nullRate } = opts
  if (!Number.isInteger(rows) || rows < 1 || rows > 1000)
    return { status: 'error', kind: 'invalid-input', message: '行数需为 1-1000 的整数' }
  if (nullRate < 0 || nullRate > 0.5)
    return { status: 'error', kind: 'invalid-input', message: 'NULL 比例需在 0-0.5 之间' }
  const parsed = parseColumns(sql)
  if (!parsed) return { status: 'error', kind: 'invalid-input', message: '无法解析建表语句,请检查 CREATE TABLE 语法' }
  const colList = parsed.columns.map((c) => `\`${c.name}\``).join(', ')
  const lines: string[] = []
  for (let i = 0; i < rows; i++) {
    const vals = parsed.columns.map((c) => cellValue(c, i, nullRate)).join(', ')
    lines.push(`INSERT INTO \`${parsed.table}\` (${colList}) VALUES (${vals});`)
  }
  return { status: 'ok', data: lines.join('\n') }
}
