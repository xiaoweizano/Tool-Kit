import { describe, it, expect, beforeAll } from 'vitest'
import { parseJwt, signJwt, verifyJwt, renewJwt } from '@tools/jwt-tool/transform'

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
