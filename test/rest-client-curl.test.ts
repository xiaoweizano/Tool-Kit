import { describe, it, expect } from 'vitest'
import { parseCurl, tokenize } from '@tools/rest-api-client/curl-parse'

const ok = (t: string) => {
  const r = parseCurl(t)
  if (r.status !== 'ok') throw new Error(JSON.stringify(r))
  return r.data
}

describe('curl-parse bash', () => {
  it('解析 Chrome bash GET', () => {
    const d = ok(`curl 'https://api.x.com/u' \\\n  -H 'accept: application/json' \\\n  --compressed`)
    expect(d.method).toBe('GET')
    expect(d.url).toBe('https://api.x.com/u')
    expect(d.headers[0].key).toBe('accept')
  })
  it('--data-raw 触发 POST + body', () => {
    const d = ok(`curl 'https://x' --data-raw '{"a":1}'`)
    expect(d.method).toBe('POST')
    expect(d.body).toBe('{"a":1}')
  })
  it('-b 转 Cookie 头', () => {
    const d = ok(`curl 'https://x' -b 'sid=9'`)
    expect(d.headers.find((h) => h.key.toLowerCase() === 'cookie')?.value).toBe('sid=9')
  })
  it('-X 覆盖', () => {
    expect(ok(`curl -X PUT 'https://x'`).method).toBe('PUT')
  })
  it('非 curl 输入 → invalid-input', () => {
    expect(parseCurl('hello world').status).toBe('error')
  })
})

describe('curl-parse bash 追加', () => {
  it('ANSI-C 单引号值(值含单引号时 Chrome 用 $ 前缀)', () => {
    const d = ok(`curl 'https://x' --data-raw $'{"msg":"don\\'t"}'`)
    expect(d.body).toBe(`{"msg":"don't"}`)
  })
  it('ANSI-C 解码 \\xNN / \\t / \\n', () => {
    expect(tokenize(`$'a\\x41\\tb\\n'`)).toEqual(['aA\tb\n'])
  })
  it('header 值含冒号,按首个冒号拆分并 trim', () => {
    const d = ok(`curl 'https://x' -H 'Authorization: Bearer a:b'`)
    expect(d.headers[0].key).toBe('Authorization')
    expect(d.headers[0].value).toBe('Bearer a:b')
  })
  it('多个 --data 取最后一个', () => {
    expect(ok(`curl 'https://x' --data 'a' --data 'b'`).body).toBe('b')
  })
  it('双引号内转义引号与反斜杠', () => {
    const d = ok(`curl 'https://x' --data "{\\"a\\":1}\\\\path"`)
    expect(d.body).toBe(`{"a":1}\\path`)
  })
  it('cmd ^" 方言 + \\^" 内引号', () => {
    const d = ok(`curl ^"https://x^" ^\n  --data-raw ^"{\\^"k\\^":\\^"v\\^"}^"`)
    expect(d.url).toBe('https://x')
    expect(d.body).toBe('{"k":"v"}')
  })
  it('{{}} 模板保持原样', () => {
    const d = ok(`curl '{{baseUrl}}/u?q={{kw}}' -H 'X-Token: {{token}}'`)
    expect(d.url).toBe('{{baseUrl}}/u?q={{kw}}')
    expect(d.headers[0].value).toBe('{{token}}')
  })
  it('ignore 标志不产生副作用', () => {
    const d = ok(`curl 'https://x' -k --insecure -L --location --compressed`)
    expect(d.url).toBe('https://x')
    expect(d.headers).toEqual([])
  })
})
