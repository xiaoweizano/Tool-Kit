import { describe, it, expect } from 'vitest'
import { tools, searchTools } from '@tools/register'

describe('注册表', () => {
  it('初始为空数组(合法状态)', () => {
    expect(Array.isArray(tools)).toBe(true)
  })
  it('searchTools 空 query 返回全部', () => {
    expect(searchTools('')).toEqual(tools)
  })
})
