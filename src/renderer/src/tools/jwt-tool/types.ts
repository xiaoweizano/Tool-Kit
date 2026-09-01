export type JwtAlg = 'HS256' | 'HS384' | 'HS512' | 'RS256' | 'RS384' | 'RS512'
export interface JwtResult {
  header?: Record<string, unknown>
  payload?: Record<string, unknown>
  isValid?: boolean
  verifyError?: string
  token?: string
  expiresAt?: string   // ISO8601
}
