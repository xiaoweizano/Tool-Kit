export type DiffMode = 'line' | 'word' | 'char'
export interface DiffInput { textA: string; textB: string; mode?: DiffMode }

export interface TextStats {
  chars: number; letters: number; digits: number; symbols: number; whitespace: number
  words: number; lines: number; uniqueChars: number; topChars: { char: string; count: number }[]
}
export type CaseMode = 'upper'|'lower'|'title'|'sentence'|'camel'|'pascal'|'snake'|'kebab'|'constant'|'alternating'
export type SegmentType = 'letters'|'digits'|'symbols'|'whitespace'
export interface Segment { type: SegmentType; text: string }
export interface SegmentOpts { customDelims?: string }   // extra chars to split on (each becomes its own symbols token boundary)
