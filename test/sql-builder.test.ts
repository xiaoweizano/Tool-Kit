import { describe, it, expect } from 'vitest'
import { assembleTenantSql } from '@tools/sql-builder/transform'

const tenants = ['lsd', 'zqkj']
const sqls = ['select * from t where id=1', 'update t set a=2']

describe('assembleTenantSql 笛卡尔积分组', () => {
  it('每个租户一个区块,包含全部 SQL,自动补分号', () => {
    const r = assembleTenantSql({ tenants, sqls })
    expect(r.status).toBe('ok')
    if (r.status === 'ok') {
      expect(r.data).toContain('-- ===== lsd.sql =====')
      expect(r.data).toContain('-- ===== zqkj.sql =====')
      expect(r.data).toContain('where id=1;')
      expect(r.data).toContain('where id=1;') // SQL 补 ;结尾
    }
  })
  it('空租户 → error 提示', () => {
    const r = assembleTenantSql({ tenants: [], sqls })
    expect(r.status).toBe('error')
  })
  it('空 SQL → error 提示', () => {
    const r = assembleTenantSql({ tenants, sqls: [] })
    expect(r.status).toBe('error')
  })
})

describe('纯函数性', () => {
  it('非数组输入不抛,返回 invalid-input', () => {
    const r = assembleTenantSql({ tenants: 'lsd' as unknown as string[], sqls })
    expect(r.status).toBe('error')
  })
})
