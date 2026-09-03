export type JwtAlg = 'HS256' | 'HS384' | 'HS512' | 'RS256' | 'RS384' | 'RS512' | 'ES256' | 'ES384' | 'ES512' | 'PS256' | 'PS384' | 'PS512'
export interface JwtFriendlyTime { field: string; iso: string; local: string }
export interface JwtResult {
  header?: Record<string, unknown>
  payload?: Record<string, unknown>
  isValid?: boolean
  verifyError?: string
  token?: string
  expiresAt?: string   // ISO8601
  friendlyTimes?: JwtFriendlyTime[]
}
