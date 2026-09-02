import { diffLines, diffWords, diffChars } from 'diff'
import type { ToolResult } from '@core/types'
import type { DiffMode } from './types'

const esc = (s: string): string => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')

export function diffText(textA: string, textB: string, mode: DiffMode): ToolResult<string> {
  if (!textA || !textB) return { status: 'error', kind: 'invalid-input', message: '请粘贴两段文本' }
  const fn = mode === 'word' ? diffWords : mode === 'char' ? diffChars : diffLines
  const parts: string[] = fn(textA, textB).map((p) => {
    if (p.added) return `<span class="text-success">${esc(p.value)}</span>`
    if (p.removed) return `<del class="text-error">${esc(p.value)}</del>`
    return esc(p.value)
  })
  return { status: 'ok', data: `<pre class="diff">${parts.join('')}</pre>` }
}
