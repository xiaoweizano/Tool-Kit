export type Radix = 2 | 8 | 10 | 16
export interface BaseConvResult { bin: string; oct: string; dec: string; hex: string }
export interface BaseConvOpts { source?: Radix }
