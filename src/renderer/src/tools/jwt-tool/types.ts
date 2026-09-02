// Only HMAC (symmetric) algorithms are currently wired. RS* (asymmetric)
// signing/verification is deferred to v2 (would require key import UI).
export type JwtAlg = 'HS256' | 'HS384' | 'HS512'
export interface JwtResult {
  header?: Record<string, unknown>
  payload?: Record<string, unknown>
  isValid?: boolean
  verifyError?: string
  token?: string
  expiresAt?: string   // ISO8601
}
