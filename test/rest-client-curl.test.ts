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

// Project a parse result onto its semantic fields (drop the random header ids)
// so a cmd parse can be compared for equality with the equivalent bash parse.
const proj = (r: ReturnType<typeof parseCurl>) =>
  r.status === 'ok'
    ? {
        method: r.data.method,
        url: r.data.url,
        headers: r.data.headers.map((h) => ({ key: h.key, value: h.value })),
        body: r.data.body,
      }
    : r

describe('curl-parse cmd + edges', () => {
  it('cmd 方言与等价 bash 结果一致', () => {
    const bash = parseCurl(`curl 'https://x' -H 'a: b' --data-raw '{"k":"v"}'`)
    const cmd = parseCurl(`curl ^"https://x^" ^\n  -H ^"a: b^" ^\n  --data-raw ^"{\\^"k\\^":\\^"v\\^"}^"`)
    expect(proj(cmd)).toEqual(proj(bash))
  })
  it('-F → unsupported', () => {
    const r = parseCurl(`curl 'https://x' -F f=@a.txt`)
    expect(r.status === 'error' && r.kind).toBe('unsupported')
  })
  it('PowerShell → invalid/unsupported 提示 bash', () => {
    const r = parseCurl(`Invoke-WebRequest -Uri 'https://x' -Method GET`)
    expect(r.status).toBe('error')
  })
  it('多个 --data 取最后', () => {
    const r = parseCurl(`curl 'x' --data 'a' --data 'b'`)
    if (r.status === 'ok') expect(r.data.body).toBe('b')
  })
})

describe('curl-parse edge rejections', () => {
  it('-F/--form → multipart unsupported 且不静默丢 body', () => {
    for (const t of [`curl 'https://x' -F f=@a.txt`, `curl 'https://x' --form 'f=@a.txt'`]) {
      const r = parseCurl(t)
      if (r.status !== 'error' || r.kind !== 'unsupported') throw new Error(JSON.stringify(r))
      expect(r.structure).toBe('multipart')
      expect(r.message).toBe('v1 不支持 multipart 文件上传')
    }
  })
  it('-d @file / --data @file / --data-binary @file → file-ref unsupported', () => {
    for (const t of [`curl 'https://x' -d @a.json`, `curl 'https://x' --data @a.json`, `curl 'https://x' --data-binary @a.bin`]) {
      const r = parseCurl(t)
      if (r.status !== 'error' || r.kind !== 'unsupported') throw new Error(JSON.stringify(r))
      expect(r.structure).toBe('file-ref')
      expect(r.message).toBe('不支持文件引用')
    }
  })
  it('--data-raw 的 @ 不当作文件引用', () => {
    expect(ok(`curl 'https://x' --data-raw '@not-a-file'`).body).toBe('@not-a-file')
  })
  it('PowerShell (Invoke-WebRequest / -Uri / -Method) → invalid-input 提示 Copy as cURL (bash)', () => {
    for (const t of [
      `Invoke-WebRequest -Uri 'https://x' -Method GET`,
      `Invoke-RestMethod -Uri 'https://x'`,
      `some-tool -Uri 'https://x' -Method GET`,
    ]) {
      const r = parseCurl(t)
      if (r.status !== 'error' || r.kind !== 'invalid-input') throw new Error(JSON.stringify(r))
      expect(r.message).toContain('Copy as cURL (bash)')
    }
  })
})
