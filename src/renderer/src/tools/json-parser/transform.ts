import type { ToolResult } from '@core/types'

export interface JsonOpts { indent?: '2' | '4' | 'tab' | 'min' }

/**
 * 0-based 字符位置 → 1-based 行列。
 * pos 指向的字符即报告位置的字符(若为行尾 '\n',则报该行末列)。
 */
export function posToLineCol(text: string, pos: number): { line: number; col: number } {
  const upTo = text.slice(0, pos)
  const line = upTo.split('\n').length
  const col = pos - (upTo.lastIndexOf('\n') + 1) + 1
  return { line, col }
}

// 轻量定位:JSON.parse 失败后,用 V8 message 中的 `position N`(或 line/column)定位;
// V8 新版 token 类错误不含 position,退化为线性扫描找首个非法字符。
function locateError(text: string, msg: string): number {
  const m = /position (\d+)/.exec(msg)
  if (m) return Number(m[1])
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if ("{}[]\":, \t\r\n-0123456789.eE+truefalsnl".includes(c)) continue
    return i
  }
  return 0
}

export function transformJson(input: string, opts?: JsonOpts): ToolResult<string> {
  const indent = opts?.indent ?? '2'
  let parsed: unknown
  try {
    parsed = JSON.parse(input)
  } catch (e) {
    const pos = locateError(input, (e as Error).message)
    const { line, col } = posToLineCol(input, pos)
    return { status: 'error', kind: 'invalid-input', message: `非法字符或结构错误(第 ${line} 行 第 ${col} 列)`, position: pos }
  }
  const space = indent === 'min' ? 0 : indent === 'tab' ? '\t' : Number(indent)
  try {
    return { status: 'ok', data: JSON.stringify(parsed, null, space as never) }
  } catch {
    return { status: 'error', kind: 'unsupported', structure: '循环引用', message: '输入含无法序列化的结构' }
  }
}
