import type { ToolResult } from '@core/types'

export interface TenantInput { tenants: string[]; sqls: string[] }

// FROM/INTO/UPDATE/JOIN/TABLE 关键字后的表标识(支持 db.table 与反引号/双引号)
const TABLE_KEYWORDS = /(\b(?:FROM|INTO|UPDATE|JOIN|TABLE)\s+)(`[^`]+`|"[^"]+"|[A-Za-z_][A-Za-z0-9_]*)(?:\s*\.\s*(`[^`]+`|"[^"]+"|[A-Za-z_][A-Za-z0-9_]*))?/gi

// 给 SQL 的表名加租户前缀:table → tenant.table;db.table → tenant.table(替换原 schema)
export function qualifyTable(sql: string, tenant: string): string {
  return sql.replace(TABLE_KEYWORDS, (m, kw, first, second) => {
    const bare = (n: string): string => n.replace(/^[`"]|[`"]$/g, '')
    const table = second ? bare(second) : bare(first)
    return `${kw}${tenant}.${table}`
  })
}

export function assembleTenantSql(input: TenantInput): ToolResult<string> {
  if (!Array.isArray(input?.tenants) || !Array.isArray(input?.sqls))
    return { status: 'error', kind: 'invalid-input', message: '租户与 SQL 需为数组' }
  const tenants = input.tenants.map((t) => t.trim()).filter(Boolean)
  const sqls = input.sqls.map((s) => s.trim()).filter(Boolean)
  if (tenants.length === 0) return { status: 'error', kind: 'invalid-input', message: '至少需要一个租户(数据库名)' }
  if (sqls.length === 0) return { status: 'error', kind: 'invalid-input', message: '至少需要一条 SQL' }

  const blocks: string[] = []
  for (const tn of tenants) {
    const header = `-- ===== ${tn}.sql =====`
    const body = sqls
      .map((s) => qualifyTable(s, tn))
      .map((s) => (s.endsWith(';') ? s : s + ';'))
      .join('\n')
    blocks.push([header, body].join('\n'))
  }
  return { status: 'ok', data: blocks.join('\n\n') }
}
