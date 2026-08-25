import { describe, it, expect } from 'vitest'
import { parseCreateTable, parseColumns, genInserts } from '@tools/testdata-gen/transform'

const DDL = `CREATE TABLE \`user\` (
  \`id\` bigint NOT NULL,
  \`email\` varchar(64) DEFAULT NULL,
  \`name\` varchar(32) NOT NULL,
  \`age\` int DEFAULT NULL,
  \`created_at\` datetime DEFAULT NULL,
  PRIMARY KEY (\`id\`)
)`

describe('parseColumns / parseCreateTable', () => {
  it('解析表名与列(跳过 PRIMARY KEY 行)', () => {
    const c = parseColumns(DDL)
    expect(c?.table).toBe('user')
    expect(c?.columns.map((x) => x.name)).toEqual(['id', 'email', 'name', 'age', 'created_at'])
  })
  it('摘要输出表名与列数', () => {
    const r = parseCreateTable(DDL)
    expect(r.status).toBe('ok')
    if (r.status === 'ok') { expect(r.data).toContain('user'); expect(r.data).toContain('5 列') }
  })
  it('支持 IF NOT EXISTS 与无反引号', () => {
    const c = parseColumns('CREATE TABLE IF NOT EXISTS t2 (a int, b varchar(10))')
    expect(c?.table).toBe('t2'); expect(c?.columns).toHaveLength(2)
  })
  it('非法输入 → invalid-input', () => {
    expect(parseCreateTable('hello world').status).toBe('error')
  })
})

describe('genInserts', () => {
  it('行数正确且格式为 INSERT', () => {
    const r = genInserts({ sql: DDL, rows: 5, nullRate: 0 })
    expect(r.status).toBe('ok')
    if (r.status === 'ok') {
      const lines = r.data.split('\n').filter(Boolean)
      expect(lines).toHaveLength(5)
      lines.forEach((l) => expect(l).toMatch(/^INSERT INTO `user` \(`id`, `email`, `name`, `age`, `created_at`\) VALUES \(.+\);$/))
    }
  })
  it('智能列名:email 含 @、age 为整数', () => {
    const r = genInserts({ sql: DDL, rows: 3, nullRate: 0 })
    if (r.status === 'ok') {
      r.data.split('\n').forEach((l) => {
        expect(l).toMatch(/'[\w.-]+@[\w.-]+\.[\w-]+'/)
        expect(l).toMatch(/, \d+, '\d{4}-\d{2}-\d{2} /)
      })
    }
  })
  it('nullRate=1 全 NULL;=0 无 NULL', () => {
    const all = genInserts({ sql: DDL, rows: 2, nullRate: 1 })
    if (all.status === 'ok') expect(all.data).toContain('NULL, NULL, NULL, NULL, NULL')
    const none = genInserts({ sql: DDL, rows: 2, nullRate: 0 })
    if (none.status === 'ok') expect(none.data).not.toContain('NULL')
  })
  it('行数/比例越界 → invalid-input', () => {
    expect(genInserts({ sql: DDL, rows: 0, nullRate: 0 }).status).toBe('error')
    expect(genInserts({ sql: DDL, rows: 1001, nullRate: 0 }).status).toBe('error')
    expect(genInserts({ sql: DDL, rows: 5, nullRate: -0.1 }).status).toBe('error')
    expect(genInserts({ sql: DDL, rows: 5, nullRate: 0.6 }).status).toBe('error')
  })
  it('布尔/枚举类型', () => {
    const ddl2 = 'CREATE TABLE t (ok boolean, st enum(\'a\',\'b\'))'
    const r = genInserts({ sql: ddl2, rows: 4, nullRate: 0 })
    if (r.status === 'ok') r.data.split('\n').forEach((l) => {
      expect(l).toMatch(/\((true|false), '(a|b)'\)/)
    })
  })
})
