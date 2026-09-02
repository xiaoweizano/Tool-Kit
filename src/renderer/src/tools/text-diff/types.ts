export type DiffMode = 'line' | 'word' | 'char'
export interface DiffInput { textA: string; textB: string; mode?: DiffMode }
