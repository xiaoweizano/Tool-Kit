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

interface ParseOutcome { value: unknown; hint: string | null }

// 渐进式解析:直连 → 双重编码(字符串里是 JSON) → 转义引号体(日志粘贴) → 简单替换兜底
function parseProgressive(raw: string): ParseOutcome | null {
  const t = raw.trim()
  if (!t) return null
  try {
    const v = JSON.parse(t)
    if (typeof v === 'string') {
      try {
        const inner = JSON.parse(v)
        if (inner !== null && typeof inner === 'object')
          return { value: inner, hint: '自动解包:外层为字符串,内层是 JSON' }
      } catch { /* 内层不是 JSON,按普通字符串字面量处理 */ }
      return { value: v, hint: null }
    }
    return { value: v, hint: null }
  } catch { /* 落入还原路径 */ }
  try {
    const unwrapped = JSON.parse('"' + t + '"')
    if (typeof unwrapped === 'string') {
      const inner = JSON.parse(unwrapped)
      if (inner !== null && typeof inner === 'object')
        return { value: inner, hint: '自动还原:转义引号已解除' }
    }
  } catch { /* 落入简单替换 */ }
  const simple = t.replace(/\\"/g, '"')
  if (simple !== t) {
    try {
      const v = JSON.parse(simple)
      if (v !== null && typeof v === 'object')
        return { value: v, hint: '自动还原:转义引号已解除' }
    } catch { /* 彻底无法解析 */ }
  }
  return null
}

export function transformJson(input: string, opts?: JsonOpts): ToolResult<string> {
  const indent = opts?.indent ?? '2'
  const outcome = parseProgressive(input)
  if (!outcome) {
    try {
      JSON.parse(input)
    } catch (e) {
      const pos = locateError(input, (e as Error).message)
      const { line, col } = posToLineCol(input, pos)
      return { status: 'error', kind: 'invalid-input', message: `非法字符或结构错误(第 ${line} 行 第 ${col} 列)`, position: pos }
    }
    return { status: 'error', kind: 'invalid-input', message: '无法解析为 JSON(已尝试转义/嵌套自动还原)', position: 0 }
  }
  const space = indent === 'min' ? 0 : indent === 'tab' ? '\t' : Number(indent)
  try {
    const body = JSON.stringify(outcome.value, null, space as never)
    return { status: 'ok', data: outcome.hint ? `(${outcome.hint})\n${body}` : body }
  } catch {
    return { status: 'error', kind: 'unsupported', structure: '循环引用', message: '输入含无法序列化的结构' }
  }
}
