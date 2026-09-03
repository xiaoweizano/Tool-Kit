import { describe, it, expect } from 'vitest'
import { tools, searchTools } from '@tools/register'

describe('注册表', () => {
  it('初始为数组(合法状态)', () => { expect(Array.isArray(tools)).toBe(true) })
  it('searchTools 空 query 返回全部', () => { expect(searchTools('')).toEqual(tools) })
  it('密码工具已合并为 password-tools', () => {
    const ids = tools.map((t) => t.id)
    expect(ids).toContain('password-tools')
    expect(ids).not.toContain('password-strength')
    expect(ids).not.toContain('password-generator')
  })
})
