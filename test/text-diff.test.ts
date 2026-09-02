import { describe, it, expect } from 'vitest'
import { diffText } from '@tools/text-diff/transform'

const esc = (s: string): string => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')

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
})
