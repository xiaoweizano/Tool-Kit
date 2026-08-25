import { describe, it, expect } from 'vitest'
import { matchRegex, highlightSegments, REGEX_LIBRARY } from '@tools/regex-generator/transform'

describe('matchRegex', () => {
  it('多匹配列出序号与位置', () => {
    const r = matchRegex({ pattern: '\\d+', flags: 'g', text: 'a1 b22 c333' })
    expect(r.status).toBe('ok')
    if (r.status === 'ok') {
      expect(r.data).toContain('匹配 3 处')
      expect(r.data).toContain('1')
      expect(r.data).toContain('22')
      expect(r.data).toContain('333')
    }
  })
  it('无匹配明确提示', () => {
    const r = matchRegex({ pattern: '^x$', flags: '', text: 'y' })
    expect(r.status).toBe('ok')
    if (r.status === 'ok') expect(r.data).toContain('无匹配')
  })
  it('非法正则 → invalid-input', () => {
    const r = matchRegex({ pattern: '[', flags: '', text: 'x' })
    expect(r.status).toBe('error')
    if (r.status === 'error') { expect(r.kind).toBe('invalid-input'); expect(typeof r.message).toBe('string') }
  })
  it('空 pattern → invalid-input', () => {
    const r = matchRegex({ pattern: '', flags: '', text: 'x' })
    expect(r.status).toBe('error')
  })
})

describe('highlightSegments', () => {
  it('匹配与非匹配分段', () => {
    const s = highlightSegments('\\d+', 'g', 'a1b22')
    const matched = s.segments.filter((x) => x.matched).map((x) => x.text)
    expect(matched).toEqual(['1', '22'])
    expect(s.segments.map((x) => x.text).join('')).toBe('a1b22')
  })
  it('非法正则整段 unmatched', () => {
    const s = highlightSegments('[', '', 'abc')
    expect(s.segments).toEqual([{ text: 'abc', matched: false }])
  })
})

describe('REGEX_LIBRARY 模板库 golden(每条可编译且与示例匹配)', () => {
  for (const t of REGEX_LIBRARY) {
    it(`${t.name} (${t.pattern})`, () => {
      expect(() => new RegExp(t.pattern, t.flags)).not.toThrow()
      expect(new RegExp(`^(?:${t.pattern})$`, t.flags).test(t.example)).toBe(true)
    })
  }
  it('至少 20 条', () => {
    expect(REGEX_LIBRARY.length).toBeGreaterThanOrEqual(20)
  })
})

describe('防护边界', () => {
  it('超长文本跳过高亮(纯文本单段)', () => {
    const big = 'a'.repeat(10_001)
    const s = highlightSegments('a', 'g', big)
    expect(s.segments).toEqual([{ text: big, matched: false }])
  })
  it('guard 截断在输出中提示', () => {
    const r = matchRegex({ pattern: 'a', flags: 'g', text: 'a'.repeat(10_005) })
    expect(r.status).toBe('ok')
    if (r.status === 'ok') expect(r.data).toContain('已截断')
  })
})
