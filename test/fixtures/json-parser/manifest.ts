import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import type { ToolResult } from '@core/types'

const dir = join(fileURLToPath(new URL('.', import.meta.url)), '.')
const rd = (f: string): string => readFileSync(join(dir, f), 'utf8').trim()

const ok = (f: string): ToolResult<string> => ({
  status: 'ok',
  data: JSON.stringify(JSON.parse(rd(f)), null, 2),
})

export type GoldenCase = {
  name: string
  input: string
  expected: ToolResult<string>
  errorKind?: 'invalid-input'
  errorPosition?: number
}

export const manifest: GoldenCase[] = [
  { name: 'nested', input: rd('nested.json'), expected: ok('nested.json') },
  { name: 'emoji', input: rd('emoji.json'), expected: ok('emoji.json') },
  { name: 'bignum', input: rd('bignum.json'), expected: ok('bignum.json') },
  { name: 'literals', input: rd('literals.json'), expected: ok('literals.json') },
  { name: 'empty-obj', input: rd('empty.json'), expected: { status: 'ok', data: '{}' } },
  { name: 'empty-arr', input: rd('empty-arr.json'), expected: { status: 'ok', data: '[]' } },
  { name: 'truncated', input: rd('truncated.json'),
    expected: { status: 'error', kind: 'invalid-input', message: '' },
    errorKind: 'invalid-input' },
  { name: 'illegal', input: rd('illegal.json'),
    expected: { status: 'error', kind: 'invalid-input', message: '' },
    errorKind: 'invalid-input', errorPosition: 7 },
]
