import type { ToolResult } from '@core/types'
import type { BaseConvResult, BaseConvOpts, Radix } from './types'

export function convertBase(str: string, opts?: BaseConvOpts): ToolResult<BaseConvResult> {
  let s = str.trim()
  if (!s) return { status: 'error', kind: 'invalid-input', message: '请输入数字' }
  let source: Radix = opts?.source ?? 10
  const pref: Record<Radix, string> = { 2: '0b', 8: '0o', 10: '', 16: '0x' }
  if (source === 10) {
    for (const k of [2, 8, 16] as Radix[]) { if (s.toLowerCase().startsWith(pref[k])) { source = k; s = s.slice(2) } }
  }
  const valid: Record<Radix, RegExp> = { 2: /^[01]+$/, 8: /^[0-7]+$/, 10: /^[0-9]+$/, 16: /^[0-9A-Fa-f]+$/ }
  if (!valid[source].test(s)) {
    const bad = [...s].find((c) => !valid[source].test(c))!
    return { status: 'error', kind: 'invalid-input', position: s.indexOf(bad), message: `非法的${source === 2 ? '二进制' : source === 8 ? '八进制' : source === 16 ? '十六进制' : '十进制'}字符 "${bad}"` }
  }
  const radixNames: Record<Radix, number> = { 2: 2, 8: 8, 10: 10, 16: 16 }
  let big = BigInt(0)
  for (const c of s) big = big * BigInt(radixNames[source]) + BigInt(parseInt(c, radixNames[source]))
  return { status: 'ok', data: { bin: '0b' + big.toString(2), oct: '0o' + big.toString(8), dec: big.toString(10), hex: '0x' + big.toString(16).toUpperCase() } }
}
