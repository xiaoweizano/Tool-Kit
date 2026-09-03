export interface RandomGenOpts {
  length: number
  lower: boolean
  upper: boolean
  digit: boolean
  symbol: boolean
  customChars?: string
  excludeAmbiguous?: boolean // exclude 0/O/1/l/I
  count?: number             // >1 → array output
  targetLevel?: 'weak' | 'medium' | 'strong'
}
export interface RsaResult { publicKey: string; privateKey: string }
export interface BcryptResult { match: boolean }
