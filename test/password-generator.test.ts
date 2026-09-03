import { describe, it, expect } from 'vitest'
import { generatePassword, encryptAes, decryptAes, generateRsaKeyPair, encryptRsa, decryptRsa, hashBcrypt, verifyBcrypt } from '@tools/password-generator/transform'
import { analyzeStrength } from '@tools/password-strength/transform'

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
      // format: base64(salt[16] | iv[12] | ciphertext+tag) — must parse salt+iv back out
      const raw = Uint8Array.from(atob(e.data), (c) => c.charCodeAt(0))
      expect(raw.length).toBeGreaterThanOrEqual(16 + 12)
      const d = await decryptAes('secret', e.data)
      expect(d.status).toBe('ok')
      if (d.status === 'ok') expect(d.data).toBe('hello world')
    }
  })
  it('two encryptions of same plaintext differ (per-encryption salt)', async () => {
    const a = await encryptAes('secret', 'same')
    const b = await encryptAes('secret', 'same')
    if (a.status === 'ok' && b.status === 'ok') expect(a.data).not.toBe(b.data)
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
describe('rsa', () => {
  it('keygen → encrypt with public key → decrypt with private key restores original', async () => {
    const kp = await generateRsaKeyPair()
    expect(kp.status).toBe('ok')
    if (kp.status === 'ok') {
      expect(kp.data.publicKey).toContain('BEGIN PUBLIC KEY')
      expect(kp.data.privateKey).toContain('BEGIN PRIVATE KEY')
      const e = await encryptRsa(kp.data.publicKey, 'secret msg')
      expect(e.status).toBe('ok')
      if (e.status === 'ok') {
        const d = await decryptRsa(kp.data.privateKey, e.data)
        expect(d.status).toBe('ok')
        if (d.status === 'ok') expect(d.data).toBe('secret msg')
      }
    }
  })
  it('decryptRsa with a non-PEM key returns invalid-input', async () => {
    const d = await decryptRsa('not-a-pem', 'x')
    expect(d.status).toBe('error')
    if (d.status === 'error') expect(d.kind).toBe('invalid-input')
  })
  it('encryptRsa with a non-PEM key returns invalid-input', async () => {
    const e = await encryptRsa('not-a-pem', 'secret')
    expect(e.status).toBe('error')
    if (e.status === 'error') expect(e.kind).toBe('invalid-input')
  })
})

describe('generatePassword v2 rules', () => {
  it('excludeAmbiguous removes 0/O/1/l/I from output', () => {
    const r = generatePassword({ length: 40, lower: true, upper: true, digit: true, symbol: false, excludeAmbiguous: true })
    expect(r.status).toBe('ok')
    if (r.status === 'ok') expect(/[0O1lI]/.test(r.data as string)).toBe(false)
  })
  it('count>1 returns array of unique passwords', () => {
    const r = generatePassword({ length: 12, lower: true, upper: true, digit: true, symbol: true, count: 5 })
    expect(r.status).toBe('ok')
    if (r.status === 'ok') {
      const arr = r.data as string[]
      expect(arr.length).toBe(5)
      expect(new Set(arr).size).toBe(5)
    }
  })
  it('targetLevel strong guarantees level strong', () => {
    const r = generatePassword({ length: 14, lower: true, upper: true, digit: true, symbol: true, targetLevel: 'strong' })
    expect(r.status).toBe('ok')
    if (r.status === 'ok') {
      const a = analyzeStrength(r.data as string)
      if (a.status === 'ok') expect(a.data.level).toBe('strong')
    }
  })
})
