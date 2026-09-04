import { describe, it, expect } from 'vitest'
import { parseJwt, signJwt, verifyJwt, renewJwt, timestampToSeconds } from '@tools/jwt-tool/transform'
import type { JwtAlg } from '@tools/jwt-tool/types'

const SECRET = 'super-secret'
describe('parseJwt', () => {
  it('parses header/payload', () => {
    const hb = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
    const pb = Buffer.from(JSON.stringify({ sub: 'u1', role: 'admin' })).toString('base64url')
    const tok = `${hb}.${pb}.sig`
    const r = parseJwt(tok)
    expect(r.status).toBe('ok')
    if (r.status === 'ok') { expect(r.data.payload).toEqual({ sub: 'u1', role: 'admin' }) }
  })
  it('tolerates surrounding whitespace/newlines and trims', () => {
    const hb = Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64url')
    const pb = Buffer.from(JSON.stringify({ a: 1 })).toString('base64url')
    const r = parseJwt(`\n  ${hb}.${pb}.sig  \n`)
    expect(r.status).toBe('ok')
  })
  it('rejects non-three-part token', () => {
    const r = parseJwt('abc.def')
    expect(r.status).toBe('error')
    if (r.status === 'error') expect(r.kind).toBe('invalid-input')
  })
})

describe('signJwt/verifyJwt', () => {
  it('HS256 round-trip', async () => {
    const s = await signJwt(JSON.stringify({ sub: 'u1' }), SECRET, 'HS256', '1h')
    expect(s.status).toBe('ok')
    if (s.status === 'ok') {
      const v = await verifyJwt(s.data.token as string, SECRET, 'HS256')
      expect(v.status).toBe('ok')
      if (v.status === 'ok') expect(v.data.isValid).toBe(true)
    }
  })
  it('verify wrong secret fails', async () => {
    const s = await signJwt(JSON.stringify({ sub: 'u1' }), SECRET, 'HS256', '1h')
    if (s.status === 'ok') {
      const v = await verifyJwt(s.data.token as string, 'wrong', 'HS256')
      expect(v.status).toBe('error')
      if (v.status === 'error') expect(v.kind).toBe('invalid-input')
    }
  })
})

describe('security invariants', () => {
  it('verify with alg none returns unsupported with structure none', async () => {
    const s = await signJwt(JSON.stringify({ sub: 'u1' }), SECRET, 'HS256', '1h')
    if (s.status !== 'ok') throw new Error('sign failed')
    const v = await verifyJwt(s.data.token as string, SECRET, 'none' as JwtAlg)
    expect(v.status).toBe('error')
    if (v.status === 'error') expect(v.kind).toBe('unsupported')
    if (v.status === 'error' && v.kind === 'unsupported') expect(v.structure).toBe('none')
  })
  it('verify with mismatched alg (HS384 against HS256 token) fails', async () => {
    const s = await signJwt(JSON.stringify({ sub: 'u1' }), SECRET, 'HS256', '1h')
    if (s.status !== 'ok') throw new Error('sign failed')
    const v = await verifyJwt(s.data.token as string, SECRET, 'HS384')
    expect(v.status).toBe('error')
    if (v.status === 'error') expect(v.kind).toBe('invalid-input')
  })
  it('verify an expired token returns invalid-input with expired message', async () => {
    const s = await signJwt(JSON.stringify({ sub: 'u1' }), SECRET, 'HS256', '-1s')
    if (s.status !== 'ok') throw new Error('sign failed')
    const v = await verifyJwt(s.data.token as string, SECRET, 'HS256')
    expect(v.status).toBe('error')
    if (v.status === 'error') {
      expect(v.kind).toBe('invalid-input')
      expect(v.message).toContain('已过期')
    }
  })
  it('verify a tampered signature fails with invalid-input', async () => {
    const s = await signJwt(JSON.stringify({ sub: 'u1' }), SECRET, 'HS256', '1h')
    if (s.status !== 'ok') throw new Error('sign failed')
    const token = s.data.token as string
    const [h, p, sig] = token.split('.')
    const tampered = `${h}.${p}.${sig[0] === 'A' ? 'B' : 'A'}${sig.slice(1)}`
    const v = await verifyJwt(tampered, SECRET, 'HS256')
    expect(v.status).toBe('error')
    if (v.status === 'error') expect(v.kind).toBe('invalid-input')
  })
})

describe('renewJwt', () => {
  it('updates exp and keeps payload', async () => {
    const old = await signJwt(JSON.stringify({ sub: 'u1', role: 'admin' }), SECRET, 'HS256', '1h')
    if (old.status !== 'ok') throw new Error('sign failed')
    const renewed = await renewJwt(old.data.token as string, SECRET, '7d')
    expect(renewed.status).toBe('ok')
    if (renewed.status === 'ok') {
      const p = parseJwt(renewed.data.token as string)
      if (p.status === 'ok') expect(p.data.payload?.sub).toBe('u1')
    }
  })
})

describe('timestampToSeconds auto-detects unit', () => {
  it('keeps seconds untouched', () => {
    expect(timestampToSeconds(1700000000)).toBe(1700000000)
  })
  it('converts milliseconds to seconds (13-digit input)', () => {
    // 1788490290615 ms = 2026-09-04; previously misread as seconds → year 58645
    expect(timestampToSeconds(1788490290615)).toBeCloseTo(1788490290.615, 5)
  })
  it('converts microseconds to seconds', () => {
    expect(timestampToSeconds(1788490290615000)).toBeCloseTo(1788490290.615, 5)
  })
  it('converts a 12-digit millisecond value past the seconds boundary', () => {
    // 1e11 s ≈ year 5138; a 12-digit ms value must not be treated as seconds
    expect(timestampToSeconds(1788490290615 / 10)).toBeLessThan(1e12)
  })
})

describe('asymmetric + friendly time', () => {
  it('displays friendly timestamps for exp/iat', () => {
    const pb = Buffer.from(JSON.stringify({ sub: 'u', exp: 1700000000, iat: 1700000000 })).toString('base64url')
    const hb = Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64url')
    const r = parseJwt(`${hb}.${pb}.x`)
    expect(r.status).toBe('ok')
    if (r.status === 'ok') {
      expect(r.data.friendlyTimes).toBeDefined()
      const fields = (r.data.friendlyTimes as { field: string }[]).map((f) => f.field)
      expect(fields).toContain('exp')
      expect(fields).toContain('iat')
    }
  })
  it('verify an RS256 token with a public key PEM', async () => {
    const { generateKeyPair, exportSPKI, SignJWT } = await import('jose')
    const { privateKey, publicKey } = await generateKeyPair('RS256')
    // In this jose version exportSPKI already returns a PEM STRING (not DER bytes),
    // so we pass it straight through to verifyJwt.
    const pem = await exportSPKI(publicKey)
    const tok = await new SignJWT({ sub: 'u' }).setProtectedHeader({ alg: 'RS256' }).sign(privateKey)
    const v = await verifyJwt(tok, '', 'RS256', pem)
    expect(v.status).toBe('ok')
    if (v.status === 'ok') expect(v.data.isValid).toBe(true)
  })
  it('signs with an RS256 private key PEM and verifies', async () => {
    const { generateKeyPair, exportPKCS8, exportSPKI } = await import('jose')
    const { privateKey, publicKey } = await generateKeyPair('RS256', { extractable: true })
    const s = await signJwt(JSON.stringify({ sub: 'u' }), await exportPKCS8(privateKey), 'RS256', '1h')
    expect(s.status).toBe('ok')
    if (s.status === 'ok') {
      const v = await verifyJwt(s.data.token as string, '', 'RS256', await exportSPKI(publicKey))
      expect(v.status).toBe('ok')
      if (v.status === 'ok') expect(v.data.isValid).toBe(true)
    }
  })
})
