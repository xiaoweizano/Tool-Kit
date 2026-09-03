import bcrypt from 'bcryptjs'
import type { ToolResult } from '@core/types'
import { analyzeStrength } from '@tools/password-strength/transform'
import type { RandomGenOpts, RsaResult, BcryptResult } from './types'

const b64 = (buf: ArrayBuffer): string => btoa(String.fromCharCode(...new Uint8Array(buf)))

const AMBIGUOUS = /[0O1lI]/
function buildPool(o: RandomGenOpts): string {
  let pool = ''
  if (o.lower) pool += 'abcdefghijklmnopqrstuvwxyz'
  if (o.upper) pool += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  if (o.digit) pool += '0123456789'
  if (o.symbol) pool += '!@#$%^&*()-_=+[]{};:,.<>?'
  if (o.customChars) pool += o.customChars
  if (o.excludeAmbiguous) pool = [...pool].filter((c) => !AMBIGUOUS.test(c)).join('')
  return pool
}
function onePass(o: RandomGenOpts, pool: string): string {
  const buf = new Uint32Array(o.length)
  crypto.getRandomValues(buf)
  let out = ''
  for (let i = 0; i < o.length; i++) out += pool[buf[i] % pool.length]
  return out
}
export function generatePassword(opts: RandomGenOpts): ToolResult<string> | ToolResult<string[]> {
  if (opts.length < 4 || opts.length > 128) return { status: 'error', kind: 'invalid-input', message: '长度需在 4-128' }
  const pool = buildPool(opts)
  if (!pool) return { status: 'error', kind: 'invalid-input', message: '请至少选择一种字符集' }
  const count = opts.count ?? 1
  const meet = (pw: string): boolean => {
    if (!opts.targetLevel) return true
    const a = analyzeStrength(pw)
    return a.status === 'ok' && a.data.level === opts.targetLevel
  }
  const gather = (): string[] => {
    const seen = new Set<string>(); const out: string[] = []
    let guard = 0
    while (out.length < count && guard < 200 * count) {
      guard++
      const pw = onePass(opts, pool)
      if (meet(pw) && !seen.has(pw)) { seen.add(pw); out.push(pw) }
    }
    return out
  }
  const res = gather()
  if (count === 1) return { status: 'ok', data: res[0] ?? '' }
  return { status: 'ok', data: res }
}

const getKey = async (passphrase: string, salt: BufferSource): Promise<CryptoKey> => {
  const enc = new TextEncoder().encode(passphrase)
  const baseKey = await crypto.subtle.importKey('raw', enc, 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    baseKey, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
  )
}

export async function encryptAes(passphrase: string, plaintext: string): Promise<ToolResult<string>> {
  if (!plaintext) return { status: 'error', kind: 'invalid-input', message: '请输入明文' }
  try {
    // Random 16-byte salt per encryption (passphrase padding must NOT be reused
    // as the PBKDF2 salt — no per-encryption randomness would let identical
    // plaintexts derive identical keys).
    const salt = crypto.getRandomValues(new Uint8Array(16))
    const key = await getKey(passphrase, salt)
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plaintext))
    const full = new Uint8Array(salt.length + iv.length + ct.byteLength)
    full.set(salt); full.set(iv, salt.length); full.set(new Uint8Array(ct), salt.length + iv.length)
    return { status: 'ok', data: btoa(String.fromCharCode(...full)) }
  } catch { return { status: 'error', kind: 'invalid-input', message: '加密失败' } }
}

export async function decryptAes(passphrase: string, ciphertext: string): Promise<ToolResult<string>> {
  try {
    const raw = Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0))
    // salt(16) | iv(12) | ciphertext+tagauth
    if (raw.length < 16 + 12) throw new Error('too short')
    const salt = raw.slice(0, 16), iv = raw.slice(16, 28), ct = raw.slice(28)
    const key = await getKey(passphrase, salt)
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct)
    return { status: 'ok', data: new TextDecoder().decode(pt) }
  } catch { return { status: 'error', kind: 'invalid-input', message: '解密失败:密钥不匹配或密文损坏' } }
}

export async function generateRsaKeyPair(): Promise<ToolResult<RsaResult>> {
  try {
    const kp = await crypto.subtle.generateKey({ name: 'RSA-OAEP', modulusLength: 2048, publicExponent: new Uint8Array([1,0,1]), hash: 'SHA-256' }, true, ['encrypt','decrypt'])
    const pub = await crypto.subtle.exportKey('spki', kp.publicKey)
    const priv = await crypto.subtle.exportKey('pkcs8', kp.privateKey)
    const toPem = (buf: ArrayBuffer, label: string): string => {
      const s = b64(buf).replace(/(.{64})/g, '$1\n')
      return `-----BEGIN ${label}-----\n${s}\n-----END ${label}-----`
    }
    return { status: 'ok', data: { publicKey: toPem(pub, 'PUBLIC KEY'), privateKey: toPem(priv, 'PRIVATE KEY') } }
  } catch { return { status: 'error', kind: 'engine', message: 'RSA 密钥生成失败' } }
}

const importPublic = async (pem: string): Promise<CryptoKey> => {
  const body = pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '')
  const der = Uint8Array.from(atob(body), (c) => c.charCodeAt(0))
  // try SPKI then PKCS#1
  for (const fmt of ['spki', 'pkcs1'] as const) {
    try { return await crypto.subtle.importKey(fmt as 'raw' | 'spki' | 'pkcs8', der, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['encrypt']) } catch { /* next */ }
  }
  throw new Error('bad key')
}
const importPrivate = async (pem: string): Promise<CryptoKey> => {
  const body = pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '')
  const der = Uint8Array.from(atob(body), (c) => c.charCodeAt(0))
  for (const fmt of ['pkcs8', 'pkcs1'] as const) {
    try { return await crypto.subtle.importKey(fmt as 'raw' | 'spki' | 'pkcs8', der, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['decrypt']) } catch { /* next */ }
  }
  throw new Error('bad key')
}

export async function encryptRsa(publicPem: string, plaintext: string): Promise<ToolResult<string>> {
  if (!plaintext) return { status: 'error', kind: 'invalid-input', message: '请输入明文' }
  try {
    const key = await importPublic(publicPem)
    const ct = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, key, new TextEncoder().encode(plaintext))
    return { status: 'ok', data: b64(ct) }
  } catch { return { status: 'error', kind: 'invalid-input', message: '密钥格式无效或加密失败' } }
}

export async function decryptRsa(privatePem: string, ciphertext: string): Promise<ToolResult<string>> {
  try {
    const key = await importPrivate(privatePem)
    const pt = await crypto.subtle.decrypt({ name: 'RSA-OAEP' }, key, Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0)))
    return { status: 'ok', data: new TextDecoder().decode(pt) }
  } catch { return { status: 'error', kind: 'invalid-input', message: '密钥格式无效或解密失败' } }
}

export function hashBcrypt(plaintext: string): ToolResult<string> {
  if (!plaintext) return { status: 'error', kind: 'invalid-input', message: '请输入明文' }
  try { return { status: 'ok', data: bcrypt.hashSync(plaintext, 10) } } catch { return { status: 'error', kind: 'engine', message: 'BCrypt 哈希失败' } }
}

export function verifyBcrypt(plaintext: string, hash: string): ToolResult<BcryptResult> {
  if (!plaintext || !hash) return { status: 'error', kind: 'invalid-input', message: '请填写明文与 hash' }
  try {
    const match = bcrypt.compareSync(plaintext, hash)
    return { status: 'ok', data: { match } }
  } catch { return { status: 'error', kind: 'invalid-input', message: 'hash 格式非法' } }
}
