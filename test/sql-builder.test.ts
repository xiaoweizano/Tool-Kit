import { describe, it, expect } from 'vitest'
import { assembleTenantSql } from '@tools/sql-builder/transform'

const tenants = ['hgapp_byqt', 'hgapp_cjjyhb']
const sqls = ['DELETE FROM low_code_menus;', "INSERT INTO low_code_menus (id, name) VALUES ('a', '安全基础管理');"]

describe('assembleTenantSql 租户前缀化', () => {
  it('每个租户的 SQL 表名加上租户前缀(用户核心诉求)', () => {
    const r = assembleTenantSql({ tenants, sqls })
    expect(r.status).toBe('ok')
    if (r.status === 'ok') {
      expect(r.data).toContain('DELETE FROM hgapp_byqt.low_code_menus')
      expect(r.data).toContain('INSERT INTO hgapp_byqt.low_code_menus')
      expect(r.data).toContain('DELETE FROM hgapp_cjjyhb.low_code_menus')
      expect(r.data).not.toContain('FROM low_code_menus')
    }
  })
  it('FROM/INTO/UPDATE/JOIN/TABLE 关键字后的表均前缀化', () => {
    const r = assembleTenantSql({ tenants: ['t1'], sqls: ['select * from a join b on a.id=b.id', 'update c set x=1', 'truncate table d'] })
    expect(r.status).toBe('ok')
    if (r.status === 'ok') {
      expect(r.data).toContain('from t1.a join t1.b on')
      expect(r.data).toContain('update t1.c set')
      expect(r.data).toContain('truncate table t1.d')
    }
  })
  it('已带 schema 的表名替换 schema 为租户', () => {
    const r = assembleTenantSql({ tenants: ['t1'], sqls: ['insert into db1.log (id) values (1)'] })
    if (r.status === 'ok') expect(r.data).toContain('insert into t1.log (id)')
  })
  it('块头为租户.sql 文件格式', () => {
    const r = assembleTenantSql({ tenants, sqls })
    if (r.status === 'ok') expect(r.data).toContain('-- ===== hgapp_byqt.sql =====')
  })
  it('空租户/空 SQL → error 提示', () => {
    expect(assembleTenantSql({ tenants: [], sqls }).status).toBe('error')
    expect(assembleTenantSql({ tenants, sqls: [] }).status).toBe('error')
  })
  it('非数组输入不抛,返回 invalid-input', () => {
    expect(assembleTenantSql({ tenants: 'x' as unknown as string[], sqls }).status).toBe('error')
  })
})
