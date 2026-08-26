// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { getKeys, setKeys } from '@core/translate-keys'

describe('translate-keys 存储', () => {
  beforeEach(() => localStorage.clear())
  it('按引擎分字段持久化', () => {
    setKeys({ baidu: { appid: 'a1', secret: 's1' } })
    expect(getKeys().baidu?.appid).toBe('a1')
    setKeys({ baidu: { appid: 'a2', secret: 's1' } })
    expect(getKeys().baidu?.appid).toBe('a2')
  })
  it('空读返回空对象', () => { expect(getKeys()).toEqual({}) })
})
