export type Level = 'weak' | 'medium' | 'strong'
export interface StrengthCheck { id: string; label: string; passed: boolean; hint?: string }
export interface StrengthReport {
  score: number        // 0-100
  level: Level
  length: number
  checks: StrengthCheck[]
  suggestions: string[]
  charsets: { lower: boolean; upper: boolean; digit: boolean; symbol: boolean }
}
export interface GenerateOpts {
  targetLevel?: Level          // default 'medium'
  minLength?: number           // default 12
  requireCharsets?: string[]   // e.g. ['lower','upper','digit']
  excludeChars?: string        // e.g. '0Ol1'
}
