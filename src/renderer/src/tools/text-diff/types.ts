export type DiffMode = 'line' | 'word' | 'char'
export interface DiffInput { textA: string; textB: string; mode?: DiffMode }

export interface TextStats {
  chars: number; letters: number; digits: number; symbols: number; punct: number; spaces: number
  words: number; lines: number; paragraphs: number; uniqueChars: number; topChars: { char: string; count: number }[]
}
export type CellKind = 'same' | 'removed' | 'added' | 'blank'
export interface DiffCell { text: string; kind: CellKind }
export interface DiffRow { left: DiffCell; right: DiffCell }
export type CaseMode = 'upper'|'lower'|'title'|'sentence'|'camel'|'pascal'|'snake'|'kebab'|'constant'|'alternating'
export type SegmentType = 'letters'|'digits'|'symbols'|'whitespace'
export interface Segment { type: SegmentType; text: string }
export interface SegmentOpts { customDelims?: string }   // extra chars to split on (each becomes its own symbols token boundary)
