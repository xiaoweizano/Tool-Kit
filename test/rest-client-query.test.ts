import { describe, it, expect } from 'vitest'
import { parseQuery, serializeQuery } from '@tools/rest-api-client/query-params'
const val = (url: string) => parseQuery(url).params.map(p => `${p.key}=${p.value}`)
describe('query-params', () => {
  it('拆分含变量,花括号不被编码', () => {
    expect(val('{{baseUrl}}/search?q={{kw}}&page=2')).toEqual(['q={{kw}}', 'page=2'])
  })
  it('round-trip 保结构', () => {
    const url = '{{b}}/x?a=1&flag=true'
    const { base, params } = parseQuery(url)
    expect(serializeQuery(base, params)).toBe(url)
  })
  it('无 query 返回空 params', () => {
    expect(parseQuery('http://a/b')).toEqual({ base: 'http://a/b', params: [] })
  })
  it('值含已编码内容原样保留(不 double-encode)', () => {
    expect(val('x?a=%E4%B8%AD')).toEqual(['a=%E4%B8%AD'])
  })
})
