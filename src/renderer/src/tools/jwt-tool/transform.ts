import type { ToolResult } from '@core/types'
import { jwtVerify, SignJWT, importSPKI } from 'jose'
import type { JwtResult, JwtAlg, JwtFriendlyTime } from './types'

const SUPPORTED_ALGS: JwtAlg[] = ['HS256', 'HS384', 'HS512', 'RS256', 'RS384', 'RS512', 'ES256', 'ES384', 'ES512', 'PS256', 'PS384', 'PS512']

const textToKey = (secret: string): Uint8Array => new TextEncoder().encode(secret)

export function friendlyTimestamp(seconds: number): string {
  const d = new Date(seconds * 1000)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

const TIME_FIELDS = ['exp', 'iat', 'nbf']
function timeEntries(payload: Record<string, unknown>): JwtFriendlyTime[] {
  return TIME_FIELDS
    .filter((f) => typeof payload[f] === 'number')
    .map((f) => ({ field: f, iso: new Date((payload[f] as number) * 1000).toISOString(), local: friendlyTimestamp(payload[f] as number) }))
}

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
  return { status: 'ok', data: { header, payload, expiresAt, friendlyTimes: payload ? timeEntries(payload) : undefined } }
}

export async function signJwt(payloadJson: string, secret: string, alg: JwtAlg = 'HS256', expiry = '1h'): Promise<ToolResult<JwtResult>> {
  let payload: Record<string, unknown>
  try { payload = JSON.parse(payloadJson) } catch { return { status: 'error', kind: 'invalid-input', message: 'payload 不是合法 JSON' } }
  try {
    const token = await new SignJWT(payload).setProtectedHeader({ alg, typ: 'JWT' }).setIssuedAt().setExpirationTime(expiry).sign(textToKey(secret))
    return { status: 'ok', data: { token } }
  } catch { return { status: 'error', kind: 'unsupported', structure: alg, message: '签名失败,请检查密钥' } }
}

export async function verifyJwt(token: string, secret: string, alg: JwtAlg = 'HS256', publicKey?: string): Promise<ToolResult<JwtResult>> {
  if (!SUPPORTED_ALGS.includes(alg)) {
    return { status: 'error', kind: 'unsupported', structure: alg, message: '暂不支持该算法' }
  }
  try {
    let key: Uint8Array | CryptoKey
    if (alg.startsWith('HS')) key = textToKey(secret)
    else {
      if (!publicKey) return { status: 'error', kind: 'invalid-input', message: '非对称算法需粘贴公钥(PEM)' }
      key = await importSPKI(publicKey, alg.replace(/-(256|384|512)/, '') as 'RS256')
    }
    const { payload } = await jwtVerify(token.trim(), key, { algorithms: [alg] })
    return { status: 'ok', data: { payload: payload as Record<string, unknown>, isValid: true } }
  } catch (e) {
    const msg = e instanceof Error ? e.message : ''
    if (msg.includes('exp')) return { status: 'error', kind: 'invalid-input', message: 'Token 已过期' }
    return { status: 'error', kind: 'invalid-input', message: '签名不匹配或公钥无效' }
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
