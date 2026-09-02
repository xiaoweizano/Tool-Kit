import { describe, it, expect } from 'vitest'
import { diffText } from '@tools/text-diff/transform'

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
