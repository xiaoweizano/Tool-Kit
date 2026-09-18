import { describe, it, expect } from 'vitest'
import { resolveVars } from '@tools/rest-api-client/env-resolve'
describe('resolveVars', () => {
  it('baseUrl 值不被编码', () => {
    expect(resolveVars('{{baseUrl}}/users', { baseUrl: 'https://api.dev.com' })).toEqual({ resolved: 'https://api.dev.com/users', undefinedVars: [] })
  })
  it('未定义变量列出且原样保留', () => {
    const r = resolveVars('a={{x}}&b={{y}}', { x: '1' })
    expect(r.resolved).toBe('a=1&b={{y}}'); expect(r.undefinedVars).toEqual(['y'])
  })
  it('body/headers 同样替换', () => {
    expect(resolveVars('{"t":"{{tk}}"}', { tk: 'abc' }).resolved).toBe('{"t":"abc"}')
  })
})
