import { describe, it, expect } from 'vitest'
import { generatePassword, encryptAes, decryptAes, hashBcrypt, verifyBcrypt } from '@tools/password-generator/transform'

describe('generatePassword', () => {
  it('length + charset', () => {
    const r = generatePassword({ length: 20, lower: true, upper: true, digit: true, symbol: true })
    expect(r.status).toBe('ok')
    if (r.status === 'ok') expect(r.data.length).toBe(20)
  })
  it('empty input invalid', () => {
    const r = generatePassword({ length: 0, lower: true, upper: false, digit: false, symbol: false })
    expect(r.status).toBe('error')
  })
})
describe('AES round-trip', () => {
  it('encrypt then decrypt restores', async () => {
    const e = await encryptAes('secret', 'hello world')
    expect(e.status).toBe('ok')
    if (e.status === 'ok') {
      const d = await decryptAes('secret', e.data)
      expect(d.status).toBe('ok')
      if (d.status === 'ok') expect(d.data).toBe('hello world')
    }
  })
  it('wrong passphrase fails decrypt', async () => {
    const e = await encryptAes('secret', 'hello')
    if (e.status === 'ok') {
      const d = await decryptAes('wrong', e.data)
      expect(d.status).toBe('error')
      if (d.status === 'error') expect(d.kind).toBe('invalid-input')
    }
  })
})
describe('bcrypt', () => {
  it('hash + verify match', () => {
    const h = hashBcrypt('nacos-password')
    expect(h.status).toBe('ok')
    if (h.status === 'ok') {
      expect(h.data.startsWith('$2')).toBe(true)
      const v = verifyBcrypt('nacos-password', h.data)
      expect(v.status).toBe('ok')
      if (v.status === 'ok') expect(v.data.match).toBe(true)
    }
  })
  it('verify wrong plaintext is false (not error)', () => {
    const h = hashBcrypt('nacos-password')
    if (h.status === 'ok') {
      const v = verifyBcrypt('wrong', h.data)
      expect(v.status).toBe('ok')
      if (v.status === 'ok') expect(v.data.match).toBe(false)
    }
  })
})
