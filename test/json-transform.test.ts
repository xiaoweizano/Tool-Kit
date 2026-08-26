import { describe, it, expect } from 'vitest'
import { transformJson, posToLineCol } from '@tools/json-parser/transform'

const o = (s: string) => transformJson(s, { indent: '2' })

describe('transformJson 合法输入', () => {
  it('格式化嵌套对象', () => {
    const r = o('{"a":[1,2],"b":{"c":null}}')
    expect(r).toEqual({ status: 'ok', data: '{\n  "a": [\n    1,\n    2\n  ],\n  "b": {\n    "c": null\n  }\n}' })
  })
  it('中文与 emoji 原样保留', () => {
    const r = o('{"名":"值","emoji":"🎉"}')
    expect(r.status === 'ok' && r.data).toContain('🎉')
  })
  it('大数走字符串往返不丢精度断言(JSON.parse 语义即如此,锁定行为)', () => {
    const r = o('{"n":9007199254740993}')
    expect(r.status === 'ok' && JSON.parse(r.data).n).toBe(9007199254740992) // 锁定 Number 语义,文档化
  })
  it('缩进 4 与 tab', () => {
    expect(o('{"a":1}')).toEqual({ status: 'ok', data: '{\n  "a": 1\n}' })
    expect(transformJson('{"a":1}', { indent: '4' })).toEqual({ status: 'ok', data: '{\n    "a": 1\n}' })
    expect(transformJson('{"a":1}', { indent: 'tab' })).toEqual({ status: 'ok', data: '{\n\t"a": 1\n}' })
  })
  it('压缩模式', () => {
    expect(transformJson('{\n"a" : 1\n}', { indent: 'min' })).toEqual({ status: 'ok', data: '{"a":1}' })
  })
  it('空对象/空数组/字面量', () => {
    expect(o('{}')).toEqual({ status: 'ok', data: '{}' })
    expect(o('[]')).toEqual({ status: 'ok', data: '[]' })
    expect(o('null')).toEqual({ status: 'ok', data: 'null' })
  })
})

describe('transformJson 非法输入定位', () => {
  it('多余逗号给出字符位置', () => {
    const r = o('{"a":1,,}')
    expect(r.status).toBe('error')
    if (r.status === 'error' && r.kind === 'invalid-input') {
      expect(r.kind).toBe('invalid-input')
      expect(r.message).toContain('非法')
      expect(r.position).toBeGreaterThan(5)
    }
  })
  it('截断输入报错', () => {
    const r = o('{"a": [1, 2')
    expect(r.status).toBe('error')
  })
  it('首字符非法', () => {
    const r = o('x')
    expect(r.status === 'error' && r.kind === 'invalid-input' && r.position).toBe(0)
  })
})

describe('posToLineCol', () => {
  // 校正说明(brief 自注歧义裁决):
  // 约定为 0-based pos → 1-based {line, col},即「pos 指向的字符」在 1-based 行列中的位置。
  // 'ab\ncd\nef' 索引:0='a' 1='b' 2='\n' 3='c' 4='d' 5='\n' 6='e' 7='f'。
  // pos 5 指向第 2 行末尾的 '\n':其前缀 'ab\ncd' 含 1 个换行 → 第 2 行;col = 5-(2+1)+1 = 3。
  // 故诚实结果为 {line: 2, col: 3}(第 2 行第 3 列,即行尾换行符本身)。
  // brief 注中「第 3 行第 2 列」的直觉对应的是 'f'(索引 7)→ {line: 3, col: 2},下方用显式断言锁定。
  it('行列换算(0-based pos → 1-based line/col)', () => {
    expect(posToLineCol('ab\ncd\nef', 5)).toEqual({ line: 2, col: 3 })
  })
  it('约定锁定:首字符与各行首/次字符', () => {
    expect(posToLineCol('ab\ncd\nef', 0)).toEqual({ line: 1, col: 1 })
    expect(posToLineCol('ab\ncd\nef', 3)).toEqual({ line: 2, col: 1 })
    expect(posToLineCol('ab\ncd\nef', 6)).toEqual({ line: 3, col: 1 })
    expect(posToLineCol('ab\ncd\nef', 7)).toEqual({ line: 3, col: 2 }) // 'f' = 第 3 行第 2 列
  })
})

describe('特殊格式 JSON 自动还原(真实日志粘贴)', () => {
  it('转义引号格式(Java toString 日志)可还原解析', () => {
    const r = o('{\\"thirdRoleIds\\":[\\"171098856505402496\\",\\"sr002\\",\\"sr013\\"],\\"thirdId\\":\\"178736529469948551\\"}')
    expect(r.status).toBe('ok')
    if (r.status === 'ok') {
      expect(r.data).toContain('自动还原')
      expect(r.data).toContain('"thirdRoleIds"')
      expect(r.data).toContain('"178736529469948551"')
      expect(r.data).not.toContain('\\"')
    }
  })
  it('双重编码(外层带引号的字符串 JSON)可解包', () => {
    const r = o('"{\\"a\\":1}"')
    expect(r.status).toBe('ok')
    if (r.status === 'ok') {
      expect(r.data).toContain('自动解包')
      expect(JSON.parse(r.data.split('\n').slice(1).join('\n'))).toEqual({ a: 1 })
    }
  })
  it('多行转义格式走简单替换兜底', () => {
    const r = o('{\n  \\"a\\": \\"x\\",\n  \\"b\\": [1, 2]\n}')
    expect(r.status).toBe('ok')
    if (r.status === 'ok') expect(r.data).toContain('"a"')
  })
  it('普通 JSON 字符串字面量仍直接格式化(无误提示)', () => {
    expect(o('"hello"')).toEqual({ status: 'ok', data: '"hello"' })
  })
  it('无法还原的非法输入仍报 invalid-input', () => {
    const r = o('{\\"a\\"}')
    expect(r.status).toBe('error')
    if (r.status === 'error') expect(r.kind).toBe('invalid-input')
  })
})

describe('性能', () => {
  it('1MB 合法输入 <200ms', () => {
    // brief 原定 12000 条仅约 697KB(其自检 toBeGreaterThan(1_000_000) 失败),提至 18000 条使体积 >1MB。
    const big = JSON.stringify({ items: Array.from({ length: 18000 }, (_, i) => ({ i, s: 'x'.repeat(40) })) })
    expect(big.length).toBeGreaterThan(1_000_000)
    const t0 = performance.now()
    const r = transformJson(big, { indent: '2' })
    const ms = performance.now() - t0
    expect(r.status).toBe('ok')
    expect(ms).toBeLessThan(200)
  })
})
