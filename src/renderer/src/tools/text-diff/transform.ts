import { diffLines, diffWords, diffChars } from 'diff'
import type { ToolResult } from '@core/types'
import type { DiffMode, TextStats, CaseMode, SegmentType, Segment, SegmentOpts } from './types'

const esc = (s: string): string => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')

export function diffText(textA: string, textB: string, mode: DiffMode): ToolResult<string> {
  if (!textA || !textB) return { status: 'error', kind: 'invalid-input', message: '请粘贴两段文本' }
  const changes = mode === 'word' ? diffWords(textA, textB) : mode === 'char' ? diffChars(textA, textB) : diffLines(textA, textB)
  const parts = changes.map((p) => {
    if (p.added) return `<span class="text-success">${esc(p.value)}</span>`
    if (p.removed) return `<del class="text-error">${esc(p.value)}</del>`
    return esc(p.value)
  })
  return { status: 'ok', data: `<pre class="diff">${parts.join('')}</pre>` }
}

export function textStats(text: string): ToolResult<TextStats> {
  const chars = text.length
  const letters = (text.match(/[A-Za-z]/g) ?? []).length
  const digits = (text.match(/[0-9]/g) ?? []).length
  const symbols = (text.match(/[^A-Za-z0-9\s]/g) ?? []).length
  const whitespace = (text.match(/\s/g) ?? []).length
  const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length
  const lines = text === '' ? 0 : text.split(/\r?\n/).length
  const uniqueChars = new Set(text).size
  const freq = new Map<string, number>()
  for (const c of text) freq.set(c, (freq.get(c) ?? 0) + 1)
  const topChars = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([char, count]) => ({ char, count }))
  return { status: 'ok', data: { chars, letters, digits, symbols, whitespace, words, lines, uniqueChars, topChars } }
}

export function applyCase(text: string, mode: CaseMode): ToolResult<string> {
  const words = text.split(/[^A-Za-z0-9]+/).filter(Boolean)
  let result: string
  switch (mode) {
    case 'upper': result = text.toUpperCase(); break
    case 'lower': result = text.toLowerCase(); break
    case 'title': result = words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' '); break
    case 'sentence': result = text.toLowerCase().replace(/^\s*\S/, (m) => m.toUpperCase()); break
    case 'camel': result = words.map((w, i) => i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(''); break
    case 'pascal': result = words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(''); break
    case 'snake': result = words.map((w) => w.toLowerCase()).join('_'); break
    case 'kebab': result = words.map((w) => w.toLowerCase()).join('-'); break
    case 'constant': result = words.map((w) => w.toUpperCase()).join('_'); break
    case 'alternating': result = [...text].map((c, i) => i % 2 === 0 ? c.toUpperCase() : c.toLowerCase()).join(''); break
    default: result = text
  }
  return { status: 'ok', data: result }
}

const typeOf = (c: string, delims: Set<string>): SegmentType => {
  if (delims.has(c)) return 'symbols'
  if (/[A-Za-z]/.test(c)) return 'letters'
  if (/[0-9]/.test(c)) return 'digits'
  if (/\s/.test(c)) return 'whitespace'
  return 'symbols'
}

export function segmentText(text: string, opts?: SegmentOpts): ToolResult<Segment[]> {
  const delims = new Set(opts?.customDelims ?? '')
  const tokens: Segment[] = []
  for (const c of text) {
    const t = typeOf(c, delims)
    const last = tokens[tokens.length - 1]
    if (last && last.type === t && t !== 'symbols') last.text += c
    else if (last && last.type === t && t === 'symbols') last.text += c
    else tokens.push({ type: t, text: c })
  }
  return { status: 'ok', data: tokens }
}
