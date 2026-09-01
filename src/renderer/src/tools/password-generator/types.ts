export interface RandomGenOpts { length: number; lower: boolean; upper: boolean; digit: boolean; symbol: boolean; customChars?: string }
export interface RsaResult { publicKey: string; privateKey: string }
export interface BcryptResult { match: boolean }
