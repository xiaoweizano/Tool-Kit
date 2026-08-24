import { describe, it, expect, beforeEach, vi } from 'vitest'

// 注册表为空(工具在 Task 10 接入),mock 出 a–f 供过滤校验
vi.mock('@tools/register', () => ({
  tools: ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => ({
    id,
    name: id.toUpperCase(),
    route: `/${id}`
  }))
}))

import { pushRecent, getRecent } from '@core/recent'

describe('最近使用', () => {
  beforeEach(() => localStorage.clear())
  it('推入并去重置顶,最多 5 条', () => {
    for (const id of ['a', 'b', 'a', 'c', 'd', 'e', 'f']) pushRecent(id)
    // 输入 a,b,a,c,d,e,f:第二次 a 去重置顶,淘汰最早入列的 b → f,e,d,c,a
    expect(getRecent()).toEqual(['f', 'e', 'd', 'c', 'a'])
  })
})
