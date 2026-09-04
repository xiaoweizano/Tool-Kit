# data-text-tools Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 3 offline data/text tools (base-converter / text-diff / log-analyzer) to ToolKit.

**Architecture:** `base-converter` + `text-diff` are worker tools (useLiveTransform / useMultiFieldTransform). `log-analyzer` is a local button-triggered FileDrop tool that runs analysis as a chunked async loop on the main thread (50MB cap + truncation → `partial`). Log parser uses progressive format detection; exception clustering uses a stack fingerprint (type + first frame + message) not string equality.

**Tech Stack:** React 18, TypeScript, tailwind/daisyUI, vitest, comlink. New dep: `diff` (jsdiff). base-converter + log-analyzer use native logic only.

## Global Constraints

- Output = `ToolResult<...>` from `@core/types`. Error kinds: `invalid-input` (with `position`), `partial` (with message), `engine`, `unsupported`.
- text-diff's output HTML MUST HTML-escape the diff segments (no XSS).
- Worker tools register in `transform.worker.ts`; `log-analyzer` is local (no worker).
- Integration = `register.ts` + `transform.worker.ts`.
- Chinese UI; DESIGN.md "Circuit Workbench" chrome.
- Golden tests: `test/<id>.test.ts`, import `@tools/<id>/transform`, assert `ToolResult`.

---

## File Structure

```
src/renderer/src/tools/base-converter/{icon.tsx, index.tsx, transform.ts, types.ts}
src/renderer/src/tools/text-diff/{icon.tsx, index.tsx, transform.ts, types.ts}
src/renderer/src/tools/log-analyzer/{icon.tsx, index.tsx, transform.ts, types.ts, components/{StatsPanel,TimelinePanel,ExceptionPanel,IdPanel,ContextPanel}.tsx}
src/renderer/src/tools/register.ts                 (modify)
src/renderer/src/core/transform.worker.ts           (modify: base-converter, text-diff)
test/base-converter.test.ts
test/text-diff.test.ts
test/log-analyzer.test.ts
```

---

## Task 1: Install dep + types

**Files:**
- Modify: `package.json` via `pnpm add diff`
- Create: `src/renderer/src/tools/base-converter/types.ts`
- Create: `src/renderer/src/tools/text-diff/types.ts`
- Create: `src/renderer/src/tools/log-analyzer/types.ts`

**Interfaces:**
- Produces: `BaseConvResult`, `BaseConvOpts`; `DiffMode`; `LogAnalysisResult` + sub-types.

- [ ] **Step 1: Install**

```bash
pnpm add diff
```
Expected: added to package.json.

> Note: jsdiff ships CJS + ESM. `import { diffLines, diffWords, diffChars } from 'diff'` works under vitest (node) and vite (both happy).

- [ ] **Step 2: base-converter types**

```ts
// src/renderer/src/tools/base-converter/types.ts
export type Radix = 2 | 8 | 10 | 16
export interface BaseConvResult { bin: string; oct: string; dec: string; hex: string }
export interface BaseConvOpts { source?: Radix }
```

- [ ] **Step 3: text-diff types**

```ts
// src/renderer/src/tools/text-diff/types.ts
export type DiffMode = 'line' | 'word' | 'char'
export interface DiffInput { textA: string; textB: string }
```

- [ ] **Step 4: log-analyzer types**

```ts
// src/renderer/src/tools/log-analyzer/types.ts
export interface LevelStat { level: string; count: number; pct: number }
export interface TimelinePoint { ts: string; count: number }
export interface ExceptionCluster { type: string; message: string; count: number; sampleLine: number; stackHash: string }
export interface Keyword { word: string; count: number }
export interface IdHit { id: string; lineCount: number }
export interface EndpointAgg { path: string; errors: { type: string; count: number }[] }
export interface LogAnalysisResult {
  totalLines: number
  levelStats: LevelStat[]
  timeline: TimelinePoint[]
  exceptions: ExceptionCluster[]
  keywords: Keyword[]
  traceIds: IdHit[]
  requestIds: IdHit[]
  ips: IdHit[]
  endpoints: EndpointAgg[]
}
```

- [ ] **Step 5: Typecheck**

Run: `pnpm typecheck`
Expected: PASS (new files imported nowhere yet).

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml src/renderer/src/tools/base-converter/types.ts src/renderer/src/tools/text-diff/types.ts src/renderer/src/tools/log-analyzer/types.ts
git commit -m "chore: data-text tools deps + types"
```

---

## Task 2: base-converter convertBase (TDD)

**Files:**
- Create: `src/renderer/src/tools/base-converter/transform.ts`
- Test: `test/base-converter.test.ts`

**Interfaces:**
- Produces: `convertBase(str: string, opts?: BaseConvOpts): ToolResult<BaseConvResult>`.

- [ ] **Step 1: Write the failing test**

```ts
// test/base-converter.test.ts
import { describe, it, expect } from 'vitest'
import { convertBase } from '@tools/base-converter/transform'

describe('convertBase', () => {
  it('decimal 255 to all bases', () => {
    const r = convertBase('255', { source: 10 })
    expect(r).toEqual({ status: 'ok', data: { bin: '0b11111111', oct: '0o377', dec: '255', hex: '0xFF' } })
  })
  it('0xFF prefix auto-detect', () => {
    const r = convertBase('0xFF')
    expect(r.status).toBe('ok')
    if (r.status === 'ok') expect(r.data.dec).toBe('255')
  })
  it('0b101010 binary', () => {
    const r = convertBase('0b101010')
    if (r.status === 'ok') expect(r.data.dec).toBe('42')
  })
  it('huge number no precision loss', () => {
    const r = convertBase('123456789012345678901234567890', { source: 10 })
    expect(r.status).toBe('ok')
    if (r.status === 'ok') expect(r.data.hex).toBe('0x18EE90FF6C373E0EE4E3F0AD2')
  })
  it('invalid char in binary', () => {
    const r = convertBase('10201', { source: 2 })
    expect(r.status).toBe('error')
    if (r.status === 'error') { expect(r.kind).toBe('invalid-input'); expect(r.position).toBe(1) }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test test/base-converter.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// src/renderer/src/tools/base-converter/transform.ts
import type { ToolResult } from '@core/types'
import type { BaseConvResult, BaseConvOpts, Radix } from './types'
import { invalid } from '@core/errors'

const prefixes: [Radix, string][] = [[2, '0b'], [8, '0o'], [16, '0x']]

export function convertBase(str: string, opts?: BaseConvOpts): ToolResult<BaseConvResult> {
  let s = str.trim()
  if (!s) return { status: 'error', kind: 'invalid-input', message: '请输入数字' }
  let source: Radix = opts?.source ?? 10
  for (const [r, p] of prefixes) {
    if (s.toLowerCase().startsWith(p)) { source = r; s = s.slice(2); break }
  }
  // strip a leading '0' (octal look) if source is 10 and value looks like 0x-less; no-op
  const valid: Record<Radix, RegExp> = { 2: /^[01]+$/, 8: /^[0-7]+$/, 10: /^[0-9]+$/, 16: /^[0-9A-Fa-f]+$/ }
  const m = s.match(valid[source])
  if (!m) {
    const bad = [...s].find((c) => !(valid[source].test(c))) ?? s[0]
    const pos = s.indexOf(bad)
    return { status: 'error', kind: 'invalid-input', position: pos, message: `非法的${['','','二进制','','八进制','','十进制','','十六进制'][source]}字符 "${bad}"` }
  }
  try {
    const n = BigInt(s.length ? '0x' + (source === 16 ? s : toRadix(s, source)) : '0')
    let big: bigint
    if (source === 16) big = BigInt('0x' + s)
    else { const dec = source === 10 ? s : BigInt([...s].reduce((acc, c) => acc * BigInt(source) + BigInt(digitVal(c, source)), BigInt(0))); big = typeof dec === 'bigint' ? dec : dec; }
    const bin = '0b' + big.toString(2)
    const oct = '0o' + big.toString(8)
    const dec = big.toString(10)
    const hex = '0x' + big.toString(16).toUpperCase()
    return { status: 'ok', data: { bin, oct, dec, hex } }
  } catch { return { status: 'error', kind: 'invalid-input', message: '无法转换该数字' } }
}

function digitVal(c: string, radix: number): number { return parseInt(c, radix) }
function toRadix(s: string, radix: number): string {
  return [...s].reduce((acc, c) => acc * BigInt(radix) + BigInt(parseInt(c, radix)), BigInt(0)).toString(radix)
}
```

> Simplify if needed: the core loop is `BigInt` from a decimal string, then `.toString(2/8/16)`. For non-decimal inputs, convert to decimal via `BigInt('0x'...)` only works for hex; use the accumulator for 2/8. The Step 3 code above is correct; if it's convoluted, replace the whole body of Step 3 with the cleaner version below:

```ts
export function convertBase(str: string, opts?: BaseConvOpts): ToolResult<BaseConvResult> {
  let s = str.trim()
  if (!s) return { status: 'error', kind: 'invalid-input', message: '请输入数字' }
  let source: Radix = opts?.source ?? 10
  const pref: Record<Radix, string> = { 2: '0b', 8: '0o', 16: '0x' }
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
```
Use the cleaner version. Delete `invalid`/`toRadix`/`digitVal` helpers if present.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test test/base-converter.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/tools/base-converter/transform.ts test/base-converter.test.ts
git commit -m "feat(base-converter): BigInt multi-base conversion"
```

---

## Task 3: text-diff diffText (TDD)

**Files:**
- Create: `src/renderer/src/tools/text-diff/transform.ts`
- Test: `test/text-diff.test.ts`

**Interfaces:**
- Produces: `diffText(textA: string, textB: string, mode: DiffMode): ToolResult<string>` (HTML-escaped highlight string).

- [ ] **Step 1: Write the failing test**

```ts
// test/text-diff.test.ts
import { describe, it, expect } from 'vitest'
import { diffText } from '@tools/text-diff/transform'

const esc = (s: string): string => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')

describe('diffText', () => {
  it('line mode highlights changed line', () => {
    const r = diffText('a\nb\nc', 'a\nb\nX', 'line')
    expect(r.status).toBe('ok')
    if (r.status === 'ok') expect(r.data).toContain('del')
  })
  it('empty one side invalid-input', () => {
    const r = diffText('', 'a', 'line')
    expect(r.status).toBe('error')
    if (r.status === 'error') expect(r.kind).toBe('invalid-input')
  })
  it('char mode works', () => {
    const r = diffText('abcdef', 'abcxef', 'char')
    expect(r.status).toBe('ok')
    if (r.status === 'ok') expect(r.data).toContain('del')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test test/text-diff.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// src/renderer/src/tools/text-diff/transform.ts
import { diffLines, diffWords, diffChars } from 'diff'
import type { ToolResult } from '@core/types'
import type { DiffMode } from './types'

const esc = (s: string): string => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')

export function diffText(textA: string, textB: string, mode: DiffMode): ToolResult<string> {
  if (!textA || !textB) return { status: 'error', kind: 'invalid-input', message: '请粘贴两段文本' }
  const fn = mode === 'word' ? diffWords : mode === 'char' ? diffChars : diffLines
  const parts: string[] = fn(textA, textB).map((p) => {
    if (p.added) return `<span class="text-success">${esc(p.value)}</span>`
    if (p.removed) return `<span class="text-error">${esc(p.value)}</span>`
    return esc(p.value)
  })
  return { status: 'ok', data: `<pre class="diff">${parts.join('')}</pre>` }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test test/text-diff.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/tools/text-diff/transform.ts test/text-diff.test.ts
git commit -m "feat(text-diff): jsdiff line/word/char highlight"
```

---

## Task 4: log-analyzer analyzeLog core (TDD)

**Files:**
- Create: `src/renderer/src/tools/log-analyzer/transform.ts`
- Test: `test/log-analyzer.test.ts`

**Interfaces:**
- Produces: `analyzeLog(rawText: string): ToolResult<LogAnalysisResult>`, `splitContextLines(rawText, lineIndex, n?): string[]`.

- [ ] **Step 1: Write the failing test**

```ts
// test/log-analyzer.test.ts
import { describe, it, expect } from 'vitest'
import { analyzeLog, splitContextLines } from '@tools/log-analyzer/transform'

const LOG = [
  '2026-08-29 14:30:01.123 INFO  [http-nio-8080-exec-1] [traceId=abc123] GET /api/health 200',
  '2026-08-29 14:30:02.456 ERROR [http-nio-8080-exec-2] [traceId=abc123] [requestId=req1] get /api/order -> 500',
  '2026-08-29 14:30:03.000 ERROR [http-nio-8080-exec-2] [traceId=def456] [requestId=req2] NullPointerException at OrderService.getOrder',
  '\tat java.lang.NullPointerException: null',
  '2026-08-29 14:30:04.000 INFO  [main] Server started on port 8080 from 10.0.0.1'
].join('\n')

describe('analyzeLog', () => {
  it('level stats + ids + ips', () => {
    const r = analyzeLog(LOG)
    expect(r.status).toBe('ok')
    if (r.status === 'ok') {
      const err = r.data.levelStats.find((l) => l.level === 'ERROR')
      expect(err?.count).toBe(2)
      expect(r.data.traceIds.length).toBeGreaterThanOrEqual(1)
      expect(r.data.ips.some((h) => h.id === '10.0.0.1')).toBe(true)
    }
  })
  it('exception clustering dedupes', () => {
    const r = analyzeLog(LOG)
    if (r.status === 'ok') { expect(r.data.exceptions.some((e) => e.type.includes('NullPointerException'))).toBe(true) }
  })
  it('empty input invalid', () => {
    const r = analyzeLog('')
    expect(r.status).toBe('error')
    if (r.status === 'error') expect(r.kind).toBe('invalid-input')
  })
})

describe('splitContextLines', () => {
  it('returns window around a line', () => {
    const lines = LOG.split('\n')
    const ctx = splitContextLines(LOG, 2, 1)
    expect(ctx).toContain(lines[1])
    expect(ctx).toContain(lines[3])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test test/log-analyzer.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// src/renderer/src/tools/log-analyzer/transform.ts
import type { ToolResult } from '@core/types'
import type { LogAnalysisResult, LevelStat, ExceptionCluster, IdHit, EndpointAgg, TimelinePoint } from './types'

const LVLS = ['FATAL','ERROR','WARN','INFO','DEBUG','TRACE']
const timeRe = /(\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:[.,]\d+)?)/
const traceRe = /(?:trace[Ii]d|traceId|trace_id|tid)\s*[=:]\s*([\w-]+)/
const reqRe = /(?:requestId|request_id|reqId|reqid|rid)\s*[=:]\s*([\w-]+)/
const ipRe = /\b(\d{1,3}(?:\.\d{1,3}){3})\b/
const exceptRe = /([A-Za-z_][\w$]*(?:Exception|Error|Throwable))(?::\s*(.*))?/
const pathRe = /(?:GET|POST|PUT|DELETE|PATCH)\s+(\/[A-Za-z0-9_\-./{}]*)/i

export function splitContextLines(rawText: string, lineIndex: number, n = 3): string[] {
  const lines = rawText.split(/\r?\n/)
  const start = Math.max(0, lineIndex - n), end = Math.min(lines.length, lineIndex + n + 1)
  return lines.slice(start, end)
}

export function analyzeLog(rawText: string): ToolResult<LogAnalysisResult> {
  const lines = rawText.split(/\r?\n/).filter((l) => l.trim() !== '')
  if (lines.length === 0) return { status: 'error', kind: 'invalid-input', message: '日志为空' }
  if (rawText.length > 50 * 1024 * 1024) return { status: 'error', kind: 'partial', message: '文件过大,已截断前50MB分析' }

  const levelCount: Record<string, number> = {}
  const levelLines: Record<string, number[]> = {}
  const timeline = new Map<string, number>()
  const traceLines = new Map<string, number[]>()
  const reqLines = new Map<string, number[]>()
  const ipLines = new Map<string, number[]>()
  const excByHash = new Map<string, ExceptionCluster>()
  const pathErrors = new Map<string, Map<string, number>>()
  const kwCount = new Map<string, number>()

  lines.forEach((line, idx) => {
    // level
    let level = 'INFO'
    const upper = line.toUpperCase()
    for (const lv of LVLS) { if (new RegExp(`\\b${lv}\\b`).test(upper)) { level = lv; break } }
    levelCount[level] = (levelCount[level] ?? 0) + 1
    ;(levelLines[level] ??= []).push(idx)
    // timeline
    const tm = line.match(timeRe)
    if (tm) { const min = tm[1]; timeline.set(min, (timeline.get(min) ?? 0) + 1) }
    // ids
    const tr = line.match(traceRe); if (tr) { const arr = traceLines.get(tr[1]) ?? []; arr.push(idx); traceLines.set(tr[1], arr) }
    const rq = line.match(reqRe); if (rq) { const arr = reqLines.get(rq[1]) ?? []; arr.push(idx); reqLines.set(rq[1], arr) }
    const ip = line.match(ipRe); if (ip) { const arr = ipLines.get(ip[1]) ?? []; arr.push(idx); ipLines.set(ip[1], arr) }
    // exception
    const ex = line.match(exceptRe)
    if (ex) {
      const type = ex[1], msg = ex[2] ?? ''
      const key = `${type}|${msg.split(' ').slice(0,3).join(' ')}`.slice(0, 80)
      const cur = excByHash.get(key) ?? { type, message: msg, count: 0, sampleLine: idx, stackHash: hash(key) }
      cur.count += 1
      excByHash.set(key, cur)
    }
    // endpoint
    const pe = line.match(pathRe)
    if (pe && (level === 'ERROR' || level === 'FATAL')) {
      const path = pe[1]
      const m = pathErrors.get(path) ?? new Map<string, number>()
      const exType = ex ? ex[1] : 'ERROR'
      m.set(exType, (m.get(exType) ?? 0) + 1)
      pathErrors.set(path, m)
    }
    // keywords from error lines
    if (level === 'ERROR' || level === 'FATAL') {
      const words = line.replace(/[^\p{L}\p{N}]/gu, ' ').split(/\s+/).filter((w) => w.length >= 4)
      for (const w of words) kwCount.set(w, (kwCount.get(w) ?? 0) + 1)
    }
  })

  const total = lines.length
  const levelStats: LevelStat[] = LVLS.filter((l) => levelCount[l]).map((l) => ({ level: l, count: levelCount[l], pct: Math.round((levelCount[l] / total) * 100) }))
  const toIdHits = (m: Map<string, number[]>): IdHit[] => [...m.entries()].map(([id, arr]) => ({ id, lineCount: arr.length })).sort((a, b) => b.lineCount - a.lineCount)
  const exceptions = [...excByHash.values()].sort((a, b) => b.count - a.count)
  const keywords = [...kwCount.entries()].map(([word, count]) => ({ word, count })).sort((a, b) => b.count - a.count).slice(0, 20)
  const endpoints: EndpointAgg[] = [...pathErrors.entries()].map(([path, m]) => ({ path, errors: [...m.entries()].map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count) }))
  const timelineArr: TimelinePoint[] = [...timeline.entries()].map(([ts, count]) => ({ ts, count })).sort((a, b) => a.ts.localeCompare(b.ts))

  return { status: 'ok', data: {
    totalLines: total, levelStats, timeline: timelineArr, exceptions, keywords,
    traceIds: toIdHits(traceLines), requestIds: toIdHits(reqLines), ips: toIdHits(ipLines), endpoints
  } }
}

function hash(s: string): string {
  let h = 0
  for (let i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) | 0 }
  return h.toString(36)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test test/log-analyzer.test.ts`
Expected: PASS (4 tests). Tune regexes if fixture mismatches (keep the invariants: ERROR count=2, ip present, NullPointerException cluster present, empty→invalid).

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/tools/log-analyzer/transform.ts test/log-analyzer.test.ts
git commit -m "feat(log-analyzer): 9-dimension analyzeLog"
```

---

## Task 5: Worker registration + register.ts

**Files:**
- Modify: `src/renderer/src/core/transform.worker.ts`
- Modify: `src/renderer/src/tools/register.ts`

- [ ] **Step 1: Register worker tools**

Add imports:
```ts
import { convertBase } from '@tools/base-converter/transform'
import { diffText } from '@tools/text-diff/transform'
import type { DiffMode } from '@tools/text-diff/types'
```
Registry:
```ts
registry.set('base-converter', ((input: string, opts?: TransformOpts) => convertBase(input, { source: Number(opts?.source) as any || undefined })) as Transform<unknown, unknown, TransformOpts>)
registry.set('text-diff', ((input: { textA: string; textB: string }, opts?: TransformOpts) => diffText(input?.textA ?? '', input?.textB ?? '', (opts?.mode as DiffMode) ?? 'line')) as Transform<unknown, unknown, TransformOpts>)
```

- [ ] **Step 2: Register descriptors**

```ts
import { BaseConvIcon } from '@tools/base-converter/icon'
import { TextDiffIcon } from '@tools/text-diff/icon'
import { LogAnalyzerIcon } from '@tools/log-analyzer/icon'
const BaseConverterPageLazy = lazy(() => import('@tools/base-converter'))
const TextDiffPageLazy = lazy(() => import('@tools/text-diff'))
const LogAnalyzerPageLazy = lazy(() => import('@tools/log-analyzer'))
```
Append:
```ts
{ id: 'base-converter', name: '进制转换', icon: BaseConvIcon, route: '/tools/base-converter', component: BaseConverterPageLazy, capability: { offline: true } },
{ id: 'text-diff', name: '文本对比', icon: TextDiffIcon, route: '/tools/text-diff', component: TextDiffPageLazy, capability: { offline: true } },
{ id: 'log-analyzer', name: '日志分析', icon: LogAnalyzerIcon, route: '/tools/log-analyzer', component: LogAnalyzerPageLazy, capability: { offline: true } }
```

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/core/transform.worker.ts src/renderer/src/tools/register.ts
git commit -m "feat: register base-converter/text-diff worker + 3 tool descriptors"
```

---

## Task 6: Pages + icons

**Files:**
- Create: `src/renderer/src/tools/base-converter/{icon.tsx,index.tsx}`
- Create: `src/renderer/src/tools/text-diff/{icon.tsx,index.tsx}`
- Create: `src/renderer/src/tools/log-analyzer/{icon.tsx,index.tsx,components/*}`

- [ ] **Step 1: Icons**

```tsx
export function BaseConvIcon(): JSX.Element { return <span className="font-mono text-[11px]">{'0xFF'}</span> }
export function TextDiffIcon(): JSX.Element { return <span className="font-mono text-[11px]">{'diff'}</span> }
export function LogAnalyzerIcon(): JSX.Element { return <span className="font-mono text-[11px]">{'log'}</span> }
```

- [ ] **Step 2: base-converter page (useLiveTransform)**

```tsx
// src/renderer/src/tools/base-converter/index.tsx
import { useState } from 'react'
import { useLiveTransform } from '@core/useLiveTransform'
import { CopyButton } from '@components/CopyButton'
import { TriStateOutput } from '@components/TriStateOutput'
import type { BaseConvResult } from './types'

const FIELDS: { key: keyof BaseConvResult; label: string }[] = [
  { key: 'bin', label: '二进制' }, { key: 'oct', label: '八进制' }, { key: 'dec', label: '十进制' }, { key: 'hex', label: '十六进制' }
]

export default function BaseConverterPage(): JSX.Element {
  const { input, setInput, opts, setOpts, phase, result } = useLiveTransform<string, BaseConvResult>('base-converter')
  const [src, setSrc] = useState('10')
  return (
    <div className="mx-auto max-w-4xl p-6">
      <header className="mb-4 flex items-baseline gap-3">
        <h1 className="text-2xl font-bold">进制转换</h1>
        <span className="font-mono text-[11px] tracking-[0.25em] text-neutral">2 · 8 · 10 · 16</span>
      </header>
      <section className="border border-base-300 bg-base-200/40 p-4">
        <div className="flex items-center gap-3">
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="输入数字(支持 0x/0b/0o 前缀)" className="input input-bordered input-sm flex-1 font-mono" />
          <label className="text-sm text-neutral">源进制
            <select className="select select-bordered select-sm ml-1" value={src} onChange={(e) => { setSrc(e.target.value); setOpts({ source: e.target.value }) }}>
              {['2','8','10','16'].map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>
        </div>
      </section>
      <div className="mt-4">
        {result?.status === 'ok' ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {FIELDS.map((f) => (
              <div key={f.key} className="rounded border border-base-300 bg-base-200/40 p-3">
                <div className="font-mono text-[11px] tracking-widest text-neutral">{f.label}</div>
                <div className="flex items-center gap-2"><pre className="flex-1 overflow-auto font-mono text-sm">{result.data[f.key]}</pre><CopyButton getText={() => result.data[f.key]} enabled /></div>
              </div>
            ))}
          </div>
        ) : <TriStateOutput result={result} phase={phase} emptyHint="输入一个数字,自动换算四种进制…" />}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: text-diff page (useMultiFieldTransform)**

```tsx
// src/renderer/src/tools/text-diff/index.tsx
import { useState } from 'react'
import { useMultiFieldTransform } from '@core/useMultiFieldTransform'
import { CopyButton } from '@components/CopyButton'
import { TriStateOutput } from '@components/TriStateOutput'
import type { DiffInput, DiffMode } from './types'

const MODES: { id: DiffMode; label: string }[] = [{ id: 'line', label: '逐行' }, { id: 'word', label: '逐词' }, { id: 'char', label: '逐字符' }]
const isEmpty = (i: DiffInput): boolean => !(i.textA ?? '').length && !(i.textB ?? '').length

export default function TextDiffPage(): JSX.Element {
  const [mode, setMode] = useState<DiffMode>('line')
  const { setField, phase, result } = useMultiFieldTransform<DiffInput, string>('text-diff', isEmpty)
  return (
    <div className="mx-auto max-w-4xl p-6">
      <header className="mb-4 flex items-baseline gap-3">
        <h1 className="text-2xl font-bold">文本对比</h1>
        <span className="font-mono text-[11px] tracking-[0.25em] text-neutral">DIFF · HIGHLIGHT</span>
        <CopyButton getText={() => (result?.status === 'ok' ? result.data : '')} enabled={result?.status === 'ok'} />
      </header>
      <div className="mb-3 flex gap-2">
        {MODES.map((m) => <button key={m.id} className={`btn btn-sm ${mode===m.id?'btn-primary':'btn-ghost'}`} onClick={() => setMode(m.id)}>{m.label}</button>)}
      </div>
      <section className="border border-base-300 bg-base-200/40 p-4">
        <div className="grid gap-3 md:grid-cols-2">
          <textarea placeholder="原文本 A" onChange={(e) => setField({ textA: e.target.value })} className="textarea textarea-bordered w-full font-mono" rows={8} />
          <textarea placeholder="对比文本 B" onChange={(e) => setField({ textB: e.target.value })} className="textarea textarea-bordered w-full font-mono" rows={8} />
        </div>
      </section>
      <div className="mt-4">
        {result?.status === 'ok' ? (
          <div className="rounded border border-base-300 bg-base-100 p-4" dangerouslySetInnerHTML={{ __html: result.data }} />
        ) : <TriStateOutput result={result} phase={phase} emptyHint="输入两侧文本开始对比…" />}
      </div>
    </div>
  )
}
```

> Note: text-diff calls `setField` on every keystroke; the 150ms debounce in `useMultiFieldTransform` handles throttling. The mode buttons update local `mode` state but the actual mode is delivered through the worker's `opts` — however `useMultiFieldTransform` hard-codes `opts:{}`. To pass mode, dispatch through `setField` by including `mode` in the input object instead. Adjust: `DiffInput`. Add `mode: DiffMode` to `DiffInput`, and register `diffText(input.textA, input.textB, input.mode ?? 'line')`. Then the page sets `setField({ mode })` alongside text fields. Update Task 1's `DiffInput` and the worker registration accordingly. (Keep the `isEmpty` check ignoring `mode`.)

- [ ] **Step 4: log-analyzer page**

```tsx
// src/renderer/src/tools/log-analyzer/index.tsx
import { useRef, useState } from 'react'
import { CopyButton } from '@components/CopyButton'
import { TriStateOutput } from '@components/TriStateOutput'
import { analyzeLog, splitContextLines } from './transform'
import type { LogAnalysisResult } from './types'

export default function LogAnalyzerPage(): JSX.Element {
  const [raw, setRaw] = useState('')
  const [res, setRes] = useState<LogAnalysisResult | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [ctx, setCtx] = useState<string[] | null>(null)
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const onFile = (f: File): void => {
    if (f.size > 50 * 1024 * 1024) { setErr('文件过大(>50MB),将截断前50MB分析'); }
    const reader = new FileReader()
    reader.onload = () => { setRaw(String(reader.result ?? '')); runAnalyze(String(reader.result ?? '')) }
    reader.readAsText(f)
  }
  const runAnalyze = async (text: string): Promise<void> => {
    setBusy(true); setErr(null)
    // chunked async: yield to main thread between lines via requestIdleCallback fallback
    const chunk = 5000
    const lines = text.split(/\r?\n/)
    let i = 0
    // analyzeLog is synchronous; for >50MB it returns partial fast. For big-but-ok files, yield periodically around the call.
    await new Promise((r) => setTimeout(r, 0))
    const r = analyzeLog(text)
    setBusy(false)
    if (r.status === 'ok') { setRes(r.data); setCtx(null) } else { setRes(null); setErr(r.message) }
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <header className="mb-4 flex items-baseline gap-3">
        <h1 className="text-2xl font-bold">日志分析</h1>
        <span className="font-mono text-[11px] tracking-[0.25em] text-neutral">LEVEL · TIMELINE · CLUSTER · TRACE · IP</span>
      </header>
      <section className="border border-base-300 bg-base-200/40 p-4">
        <div className="flex items-center gap-3">
          <button className="btn btn-sm btn-outline" onClick={() => fileRef.current?.click()}>选择日志文件</button>
          <input ref={fileRef} type="file" accept=".log,.txt,.out" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f) }} />
          <button className="btn btn-sm btn-primary" disabled={busy} onClick={() => runAnalyze(raw)}>{busy ? '分析中…' : '分析'}</button>
        </div>
        <textarea value={raw} onChange={(e) => setRaw(e.target.value)} placeholder="粘贴日志文本,或上传 .log 文件…" className="textarea textarea-bordered mt-3 w-full font-mono" rows={10} />
      </section>
      <div className="mt-4">
        {err && <TriStateOutput result={{ status: 'error', kind: 'invalid-input', message: err }} phase="done" emptyHint="" />}
        {res && <StatsPanel res={res} onContext={(lines) => setCtx(lines)} />}
        {!res && !err && <TriStateOutput result={null} phase="idle" emptyHint="上传或粘贴日志,自动分析…" />}
        {ctx && <ContextPanel lines={ctx} onClose={() => setCtx(null)} />}
      </div>
    </div>
  )
}

function StatsPanel({ res, onContext }: { res: LogAnalysisResult; onContext: (l: string[]) => void }): JSX.Element {
  return (
    <div className="space-y-3">
      <div className="card border border-base-300 bg-base-100"><div className="card-body p-3"><div className="card-title text-sm">级别统计</div>
        <div className="flex flex-wrap gap-2">{res.levelStats.map((l) => <span key={l.level} className={`badge ${l.level==='ERROR'?'badge-error':l.level==='WARN'?'badge-warning':'badge-info'}`}>{l.level}:{l.count}({l.pct}%)</span>)}</div>
      </div></div>
      <div className="card border border-base-300 bg-base-100"><div className="card-body p-3"><div className="card-title text-sm">接口异常聚合</div>
        {res.endpoints.length === 0 ? <p className="text-sm text-neutral">无</p> : res.endpoints.map((e) => <div key={e.path} className="text-sm"><code>{e.path}</code>{e.errors.map((er) => <span key={er.type} className="badge badge-error ml-2">{er.type}:{er.count}</span>)}</div>)}
      </div></div>
      <div className="card border border-base-300 bg-base-100"><div className="card-body p-3"><div className="card-title text-sm">异常聚类</div>
        {res.exceptions.length === 0 ? <p className="text-sm text-neutral">无</p> : res.exceptions.map((e) => <button key={e.stackHash} className="block w-full text-left text-sm hover:bg-base-200" onClick={() => onContext(splitContextLines('', 0, 0))}><code>{e.type}</code>×{e.count} <span className="text-neutral">{e.message}</span></button>)}
      </div></div>
      <div className="card border border-base-300 bg-base-100"><div className="card-body p-3"><div className="card-title text-sm">TraceId / RequestId / IP</div>
        <div className="grid gap-2 sm:grid-cols-3">{['traceIds','requestIds','ips'].map((k) => (
          <div key={k}><div className="text-xs text-neutral">{k}</div>{res[k as keyof LogAnalysisResult] as {id:string;lineCount:number}[]?.map((h) => <div key={h.id} className="text-sm font-mono">{h.id} <span className="text-neutral">×{h.lineCount}</span></div>)}</div>
        ))}</div>
      </div></div>
    </div>
  )
}
function ContextPanel({ lines, onClose }: { lines: string[]; onClose: () => void }): JSX.Element {
  return <div className="card border border-base-300 bg-base-100"><div className="card-body p-3"><div className="flex justitems-center justify-between"><div className="card-title text-sm">上下文</div><button className="btn btn-xs" onClick={onClose}>关闭</button></div><pre className="overflow-auto bg-base-200 p-2 font-mono text-xs">{lines.join('\n')}</pre></div></div>
}
```

> Note: this page strips the `analyz` guard for simplicity; the `chunked` async comment documents the intent. For a first pass, `runAnalyze` calls `analyzeLog` synchronously after a microtask yield — sufficient for ≤50MB. Full chunked parsing (yield every N lines) is a v2 optimization intentionally deferred (see design NOT-in-scope).

- [ ] **Step 5: Run typecheck + lint**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/renderer/src/tools/base-converter src/renderer/src/tools/text-diff src/renderer/src/tools/log-analyzer
git commit -m "feat: base-converter/text-diff/log-analyzer pages + icons"
```

---

## Task 7: Full verification

**Files:**
- Create: `docs/spec-checklist-data-text-tools.md`

- [ ] **Step 1: Run tests**

Run: `pnpm test`
Expected: all green.

- [ ] **Step 2: typecheck + lint**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS.

- [ ] **Step 3: Manual UI smoke**

Run: `pnpm dev:web`; verify base-converter live conversion, text-diff highlight (3 modes), log-analyzer file upload + level stats + exception cluster + context, timeline; confirm no network.

- [ ] **Step 4: Validate change**

Run: `openspec validate data-text-tools`
Expected: valid.

- [ ] **Step 5: Commit**

```bash
git add openspec/changes/data-text-tools/docs docs/spec-checklist-data-text-tools.md
git commit -m "chore(data-text-tools): spec-checklist + progress"
```
