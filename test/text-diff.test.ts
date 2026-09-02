import { describe, it, expect } from 'vitest'
import { diffText, textStats, applyCase, segmentText } from '@tools/text-diff/transform'
import type { CaseMode } from '@tools/text-diff/types'

describe('diffText', () => {
  it('line mode highlights changed line', () => {
    const r = diffText('a\nb\nc', 'a\nb\nX', 'line')
    expect(r.status).toBe('ok')
    if (r.status === 'ok') expect(r.data).toContain('del')
  })
  it('empty one side invalid-input', () => {
    const r = diffText('', 'a', 'line')
    expect(r.status).toBe('error')
    if (r.status === 'error') expect(r.kind).toBe('invalid-input')
  })
  it('char mode works', () => {
    const r = diffText('abcdef', 'abcxef', 'char')
    expect(r.status).toBe('ok')
    if (r.status === 'ok') expect(r.data).toContain('del')
  })
  it('word mode highlights a changed word (both added and removed markers)', () => {
    const r = diffText('the quick brown fox', 'the slow brown fox', 'word')
    expect(r.status).toBe('ok')
    if (r.status === 'ok') {
      // added marker (`text-success`) and removed marker (`<del class="text-error">`)
      expect(r.data).toContain('del')
      expect(r.data).toContain('text-success')
    }
  })
  it('HTML-escapes diff segments (no XSS)', () => {
    const r = diffText('<b>a</b>', '<i>a</i>', 'line')
    expect(r.status).toBe('ok')
    if (r.status === 'ok') {
      // raw tags never pass through; `<`/`>` are escaped to &lt;/&gt;
      expect(r.data).not.toContain('<b>')
      expect(r.data).toContain('&lt;b&gt;')
    }
  })
})

describe('textStats', () => {
  it('reports counts for a mixed string', () => {
    const r = textStats('Hello World 123!')
    expect(r.status).toBe('ok')
    if (r.status === 'ok') {
      expect(r.data.chars).toBe(16)
      expect(r.data.letters).toBe(10)
      expect(r.data.digits).toBe(3)
      expect(r.data.symbols).toBe(1)
      expect(r.data.whitespace).toBe(2)
      expect(r.data.words).toBe(3)
      expect(r.data.lines).toBe(1)
      expect(r.data.uniqueChars).toBe(12)
      expect(r.data.topChars[0]).toBeDefined()
      expect(r.data.topChars[0].count).toBeGreaterThanOrEqual(r.data.topChars[1]?.count ?? 0)
    }
  })
})

describe('applyCase', () => {
  const cases: [string, CaseMode, string][] = [
    ['hello world', 'upper', 'HELLO WORLD'],
    ['hello world', 'title', 'Hello World'],
    ['foo bar', 'camel', 'fooBar'],
    ['foo bar', 'pascal', 'FooBar'],
    ['foo bar', 'snake', 'foo_bar'],
    ['foo bar', 'kebab', 'foo-bar'],
    ['foo bar', 'constant', 'FOO_BAR'],
    ['ab', 'alternating', 'Ab'],
    ['FOO', 'sentence', 'Foo'],
  ]
  it.each(cases)('applyCase(%s, %s) -> %s', (input, mode, expected) => {
    const r = applyCase(input, mode as CaseMode)
    expect(r.status).toBe('ok')
    if (r.status === 'ok') expect(r.data).toBe(expected)
  })
})

describe('segmentText', () => {
  it('splits by type', () => {
    const r = segmentText('abc123!@def 456')
    expect(r.status).toBe('ok')
    if (r.status === 'ok') {
      expect(r.data).toEqual([
        { type: 'letters', text: 'abc' },
        { type: 'digits', text: '123' },
        { type: 'symbols', text: '!@' },
        { type: 'letters', text: 'def' },
        { type: 'whitespace', text: ' ' },
        { type: 'digits', text: '456' },
      ])
    }
  })
  it('custom delimiter splits across letters', () => {
    const r = segmentText('a@b', { customDelims: '@' })
    expect(r.status).toBe('ok')
    if (r.status === 'ok') {
      expect(r.data).toEqual([
        { type: 'letters', text: 'a' },
        { type: 'symbols', text: '@' },
        { type: 'letters', text: 'b' },
      ])
    }
  })
  it('custom delimiter splits a symbol run', () => {
    const r = segmentText('!@', { customDelims: '@' })
    expect(r.status).toBe('ok')
    if (r.status === 'ok') {
      expect(r.data).toEqual([
        { type: 'symbols', text: '!' },
        { type: 'symbols', text: '@' },
      ])
    }
  })
})
