import type { ToolResult } from '@core/types'
import { jwtVerify, SignJWT } from 'jose'
import type { JwtResult, JwtAlg } from './types'

// HS* only. RS*(asymmetric) requires a key-import/PEM UI and is deferred to v2;
// the symmetric `textToKey` path cannot produce RS signatures.
const SUPPORTED_ALGS: JwtAlg[] = ['HS256', 'HS384', 'HS512']

const textToKey = (secret: string): Uint8Array => new TextEncoder().encode(secret)

function decodePart(part: string): Record<string, unknown> | null {
  try {
    const pad = part.padEnd(Math.ceil(part.length / 4) * 4, '=')
    const json = atob(pad.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(json)
  } catch { return null }
}

export function parseJwt(token: string): ToolResult<JwtResult> {
  const t = token.trim()
  const parts = t.split('.')
  if (parts.length !== 3) return { status: 'error', kind: 'invalid-input', message: '不是合法 JWT' }
  const header = decodePart(parts[0])
  const payload = decodePart(parts[1])
  if (!header || !payload) return { status: 'error', kind: 'invalid-input', message: 'JWT 解码失败' }
  const exp = payload.exp
  const expiresAt = typeof exp === 'number' ? new Date(exp * 1000).toISOString() : undefined
  return { status: 'ok', data: { header, payload, expiresAt } }
}

export async function signJwt(payloadJson: string, secret: string, alg: JwtAlg = 'HS256', expiry = '1h'): Promise<ToolResult<JwtResult>> {
  let payload: Record<string, unknown>
  try { payload = JSON.parse(payloadJson) } catch { return { status: 'error', kind: 'invalid-input', message: 'payload 不是合法 JSON' } }
  try {
    const token = await new SignJWT(payload).setProtectedHeader({ alg, typ: 'JWT' }).setIssuedAt().setExpirationTime(expiry).sign(textToKey(secret))
    return { status: 'ok', data: { token } }
  } catch { return { status: 'error', kind: 'unsupported', structure: alg, message: '签名失败,请检查密钥' } }
}

export async function verifyJwt(token: string, secret: string, alg: JwtAlg = 'HS256'): Promise<ToolResult<JwtResult>> {
  if (!SUPPORTED_ALGS.includes(alg)) {
    return { status: 'error', kind: 'unsupported', structure: alg, message: '暂不支持该算法' }
  }
  try {
    const { payload } = await jwtVerify(token.trim(), textToKey(secret), { algorithms: [alg] })
    return { status: 'ok', data: { payload: payload as Record<string, unknown>, isValid: true } }
  } catch (e) {
    const msg = e instanceof Error ? e.message : ''
    if (msg.includes('exp')) return { status: 'error', kind: 'invalid-input', message: 'Token 已过期' }
    return { status: 'error', kind: 'invalid-input', message: '签名不匹配' }
  }
}

export async function renewJwt(token: string, secret: string, newExpiry = '1h'): Promise<ToolResult<JwtResult>> {
  const parts = token.trim().split('.')
  if (parts.length !== 3) return { status: 'error', kind: 'invalid-input', message: '不是合法 JWT' }
  const payload = decodePart(parts[1])
  if (!payload) return { status: 'error', kind: 'invalid-input', message: 'JWT 解码失败' }
  const header = decodePart(parts[0])
  const headerAlg = header && typeof header.alg === 'string' ? header.alg : ''
  const SUPPORTED = ['HS256', 'HS384', 'HS512']
  const alg = (SUPPORTED.includes(headerAlg) ? headerAlg : 'HS256') as JwtAlg
  return signJwt(JSON.stringify(payload), secret, alg, newExpiry)
}
