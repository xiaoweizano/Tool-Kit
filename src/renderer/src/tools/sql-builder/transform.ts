import type { ToolResult } from '@core/types'

export interface TenantInput { tenants: string[]; sqls: string[] }

export function assembleTenantSql(input: TenantInput): ToolResult<string> {
  if (!Array.isArray(input?.tenants) || !Array.isArray(input?.sqls))
    return { status: 'error', kind: 'invalid-input', message: '租户与 SQL 需为数组' }
  const tenants = input.tenants.map((t) => t.trim()).filter(Boolean)
  const sqls = input.sqls.map((s) => s.trim()).filter(Boolean)
  if (tenants.length === 0) return { status: 'error', kind: 'invalid-input', message: '至少需要一个租户(数据库名)' }
  if (sqls.length === 0) return { status: 'error', kind: 'invalid-input', message: '至少需要一条 SQL' }

  const blocks: string[] = []
  for (const tn of tenants) {
    const header = `-- ===== [${tn}] =====`
    const body = sqls.map((s) => (s.endsWith(';') ? s : s + ';')).join('\n')
    blocks.push([header, body].join('\n'))
  }
  return { status: 'ok', data: blocks.join('\n\n') }
}
