// test/base-converter.test.ts
import { describe, it, expect } from 'vitest'
import { convertBase } from '@tools/base-converter/transform'

describe('convertBase', () => {
  it('decimal 255 to all bases', () => {
    const r = convertBase('255', { source: 10 })
    expect(r).toEqual({ status: 'ok', data: { bin: '0b11111111', oct: '0o377', dec: '255', hex: '0xFF' } })
  })
  it('0xFF prefix auto-detect', () => {
    const r = convertBase('0xFF')
    expect(r.status).toBe('ok')
    if (r.status === 'ok') expect(r.data.dec).toBe('255')
  })
  it('0b101010 binary', () => {
    const r = convertBase('0b101010')
    if (r.status === 'ok') expect(r.data.dec).toBe('42')
  })
  it('huge number no precision loss', () => {
    const r = convertBase('123456789012345678901234567890', { source: 10 })
    expect(r.status).toBe('ok')
    if (r.status === 'ok') expect(r.data.hex).toBe('0x18EE90FF6C373E0EE4E3F0AD2')
  })
  it('invalid char in binary', () => {
    const r = convertBase('10201', { source: 2 })
    expect(r.status).toBe('error')
    if (r.status === 'error' && r.kind === 'invalid-input') { expect(r.kind).toBe('invalid-input'); expect(r.position).toBe(2) }
  })
})
