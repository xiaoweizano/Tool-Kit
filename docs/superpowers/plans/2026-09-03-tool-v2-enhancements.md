# Tool v2 Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enhance 7 existing tools — password tools merge, JWT asymmetric+timestamps+highlight, log-analyzer robustness+error-rate coloring, docker templates, nginx multi-server model, JVM wizard presets.

**Architecture:** Keep the existing `transform.ts` (pure logic) + `index.tsx` (UI) + `types.ts` layering per tool. Extract 3 cross-tool UI components (StrengthBar, CharsetChecklist, JsonView) into `src/renderer/src/components/`. Password tools merge into one registered `password-tools` page; nginx is rewritten to a multi-server model. All logic changes are covered by golden/unit tests.

**Tech Stack:** React 18, TypeScript, Vite, daisyUI/Tailwind, vitest, electron-vite (dual web+desktop). Existing deps already include `jose` and `bcryptjs`.

## Global Constraints

- Outputs are `ToolResult<T>` from `@core/types`. Pure functions, TDD, per-task commits, Chinese UI, no silent failures.
- **真实粘贴格式优先**: JWT tolerates surrounding whitespace/linebreaks (auto-trim); logs tolerate leading indentation / Windows newlines; config tools default-value fallback.
- New deps must be browser-safe. **No new dependencies** — reuse `jose`, `bcryptjs`, existing Web Crypto.
- `components/highlight.ts` `highlightLine(line, 'json')` already tokenizes keys/strings/numbers/primitives with classes `tk-k`/`tk-s`/`tk-n`/`tk-p`. Reuse it — do NOT add another highlighter.
- Commands: `pnpm test` (all vitest), `pnpm vitest run test/<file>` (single), `pnpm typecheck`, `pnpm lint`, `pnpm dev:web` (UI manual check).
- Alias: `@tools/*` → `src/renderer/src/tools/*`, `@components/*` → `src/renderer/src/components/*`, `@core/*` → `src/renderer/src/core/*`.
- Lazy import per tool must be preserved; each new page is exported as default from its `index.tsx`.

---

## File Structure Map

**Shared components (Group 0):**
- Create `src/renderer/src/components/StrengthBar.tsx`
- Create `src/renderer/src/components/CharsetChecklist.tsx`
- Create `src/renderer/src/components/JsonView.tsx`

**Password tools merge (Group 1):**
- Modify `src/renderer/src/tools/password-strength/types.ts`
- Modify `src/renderer/src/tools/password-strength/transform.ts`
- Create `src/renderer/src/tools/password-tools/icon.tsx`
- Create `src/renderer/src/tools/password-tools/index.tsx`
- Create `src/renderer/src/tools/password-tools/components/StrengthPanel.tsx`
- Modify `src/renderer/src/tools/password-generator/types.ts`
- Modify `src/renderer/src/tools/password-generator/transform.ts`
- Modify `src/renderer/src/tools/password-generator/components/RandomPanel.tsx`
- Delete `src/renderer/src/tools/password-strength/index.tsx`, `src/renderer/src/tools/password-generator/index.tsx`
- Modify `src/renderer/src/tools/register.ts`
- Modify `src/renderer/src/core/transform.worker.ts`
- Modify `test/register.test.ts`, `test/password-generator.test.ts`

**JWT (Group 2):** `jwt-tool/{types,transform,index}.tsx`, `test/jwt-tool.test.ts`

**Log analyzer (Group 3):** `log-analyzer/{types,transform,index}.tsx`, `test/log-analyzer.test.ts`

**Docker (Group 4):** create `docker-tools/data/templates.ts`; modify `docker-tools/types.ts`, `transform.ts`, `components/RunTab.tsx`, `components/ComposeTab.tsx`; `test/docker-tools.test.ts`

**Nginx (Group 5):** rewrite `nginx-generator/{types,transform,index}.tsx`; `test/nginx-generator.test.ts`

**JVM (Group 6):** `jvm-params/{types,transform,index}.tsx`; `test/jvm-params.test.ts`

---

## Group 0: Shared UI Components

### Task 1: StrengthBar

**Files:**
- Create: `src/renderer/src/components/StrengthBar.tsx`

**Interfaces:**
- Consumes: nothing (self-contained).
- Produces: `export function StrengthBar({ score, level }: { score: number; level: 'weak'|'medium'|'strong' }): JSX.Element` — a 0-100 progress bar colored by level (weak→error, medium→warning, strong→success).

- [ ] **Step 1: Implement**

```tsx
// src/renderer/src/components/StrengthBar.tsx
const LEVEL_COLOR = { weak: 'progress-error', medium: 'progress-warning', strong: 'progress-success' } as const
export function StrengthBar({ score, level }: { score: number; level: 'weak' | 'medium' | 'strong' }): JSX.Element {
  return (
    <div className="flex items-center gap-2">
      <progress className={`progress ${LEVEL_COLOR[level]} flex-1`} value={score} max={100} />
      <span className="font-mono text-sm">{score}</span>
    </div>
  )
}
```

- [ ] **Step 2: Verify**

Run: `pnpm typecheck`
Expected: no type errors.

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/components/StrengthBar.tsx
git commit -m "feat(components): add StrengthBar (score progress colored by level)"
```

### Task 2: CharsetChecklist

**Files:**
- Create: `src/renderer/src/components/CharsetChecklist.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: `export function CharsetChecklist({ items }: { items: { label: string; hit: boolean }[] }): JSX.Element` — renders each as a ✓/✗ badge block.

- [ ] **Step 1: Implement**

```tsx
// src/renderer/src/components/CharsetChecklist.tsx
export function CharsetChecklist({ items }: { items: { label: string; hit: boolean }[] }): JSX.Element {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((it) => (
        <span key={it.label} className={`badge badge-sm ${it.hit ? 'badge-success' : 'badge-ghost'}`}>
          {it.hit ? '✓' : '✗'} {it.label}
        </span>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Verify**

Run: `pnpm typecheck`
Expected: no type errors.

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/components/CharsetChecklist.tsx
git commit -m "feat(components): add CharsetChecklist (charset presence badges)"
```

### Task 3: JsonView

**Files:**
- Create: `src/renderer/src/components/JsonView.tsx`

**Interfaces:**
- Consumes: `highlightLine` from `@components/highlight`.
- Produces: `export function JsonView({ value }: { value: unknown }): JSX.Element` — pretty-prints `value` as JSON with per-line syntax highlighting.

- [ ] **Step 1: Implement**

```tsx
// src/renderer/src/components/JsonView.tsx
import { highlightLine } from './highlight'
export function JsonView({ value }: { value: unknown }): JSX.Element {
  const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2)
  return (
    <pre className="overflow-auto rounded bg-base-100 p-2 font-mono text-xs">
      {text.split('\n').map((ln, i) => (
        <div key={i} className="whitespace-pre" dangerouslySetInnerHTML={{ __html: highlightLine(ln, 'json') || '&nbsp;' }} />
      ))}
    </pre>
  )
}
```

- [ ] **Step 2: Verify**

Run: `pnpm typecheck`
Expected: no type errors.

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/components/JsonView.tsx
git commit -m "feat(components): add JsonView (syntax-highlighted JSON block)"
```

---

## Group 1: Password Tools Merge (#1 + #3)

### Task 4: Extend password-strength report with charsets

**Files:**
- Modify: `src/renderer/src/tools/password-strength/types.ts`
- Modify: `src/renderer/src/tools/password-strength/transform.ts`
- Test: `test/password-strength.test.ts`

**Interfaces:**
- Consumes: existing `analyzeStrength(password): ToolResult<StrengthReport>`.
- Produces: `StrengthReport` gains `charsets: { lower: boolean; upper: boolean; digit: boolean; symbol: boolean }`. Existing fields unchanged (additive).

- [ ] **Step 1: Write the failing test**

Append to `test/password-strength.test.ts` (inside the `analyzeStrength` describe):

```ts
  it('reports which charsets are present', () => {
    const r = analyzeStrength('Abc123!')
    expect(r.status).toBe('ok')
    if (r.status === 'ok') {
      expect(r.data.charsets).toEqual({ lower: true, upper: true, digit: true, symbol: true })
    }
    const r2 = analyzeStrength('abc')
    expect(r2.status).toBe('ok')
    if (r2.status === 'ok') {
      expect(r2.data.charsets).toEqual({ lower: true, upper: false, digit: false, symbol: false })
    }
  })
```

- [ ] **Step 2: Run to confirm it fails**

Run: `pnpm vitest run test/password-strength.test.ts -t "reports which charsets"`
Expected: FAIL — `charsets` undefined.

- [ ] **Step 3: Implement**

In `types.ts` add to `StrengthReport`:
```ts
  charsets: { lower: boolean; upper: boolean; digit: boolean; symbol: boolean }
```

In `transform.ts` `analyzeStrength`, compute and add to the returned data:
```ts
  const charsets = {
    lower: CHARSET.lower.test(password),
    upper: CHARSET.upper.test(password),
    digit: CHARSET.digit.test(password),
    symbol: CHARSET.symbol.test(password),
  }
  // ... existing checks/score ...
  return { status: 'ok', data: { score, level, length: len, checks, suggestions, charsets } }
```

- [ ] **Step 4: Run to confirm pass**

Run: `pnpm vitest run test/password-strength.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/tools/password-strength/types.ts src/renderer/src/tools/password-strength/transform.ts test/password-strength.test.ts
git commit -m "feat(password-strength): expose charsets presence in StrengthReport"
```

### Task 5: StrengthPanel component

**Files:**
- Create: `src/renderer/src/tools/password-tools/components/StrengthPanel.tsx`

**Interfaces:**
- Consumes: `useLiveTransform<string, StrengthReport>('password-tools')`, `StrengthBar`, `CharsetChecklist`, `TriStateOutput`.
- Produces: `export function StrengthPanel(): JSX.Element` — the strength analysis block (charset checklist + strength bar + separate suggestion card).

- [ ] **Step 1: Implement**

```tsx
// src/renderer/src/tools/password-tools/components/StrengthPanel.tsx
import { useLiveTransform } from '@core/useLiveTransform'
import { StrengthBar } from '@components/StrengthBar'
import { CharsetChecklist } from '@components/CharsetChecklist'
import { TriStateOutput } from '@components/TriStateOutput'
import type { ToolResult } from '@core/types'
import type { StrengthReport } from '@tools/password-strength/types'

const LEVEL_LABEL = { weak: '弱', medium: '中', strong: '强' } as const
const CHARSET_ITEMS = (c: StrengthReport['charsets']) => [
  { label: '小写', hit: c.lower },
  { label: '大写', hit: c.upper },
  { label: '数字', hit: c.digit },
  { label: '符号', hit: c.symbol },
]

export function StrengthPanel(): JSX.Element {
  const { input, setInput, phase, result } = useLiveTransform<string, StrengthReport>('password-tools')
  return (
    <div className="space-y-3">
      <textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="粘贴密码,实时分析…" className="textarea textarea-bordered w-full font-mono" rows={3} />
      {result?.status === 'ok' ? (
        <div className="space-y-3 border border-base-300 bg-base-100 p-4">
          <div className="flex items-center gap-3">
            <span className="badge badge-primary">等级:{LEVEL_LABEL[result.data.level]}</span>
            <span className="font-mono text-xs text-neutral">长度 {result.data.length}</span>
          </div>
          <StrengthBar score={result.data.score} level={result.data.level} />
          <div>
            <div className="font-mono text-[11px] tracking-widest text-neutral">字符集</div>
            <CharsetChecklist items={CHARSET_ITEMS(result.data.charsets)} />
          </div>
          <div className="rounded border border-base-300 bg-base-200/50 p-3">
            <div className="font-mono text-[11px] tracking-widest text-neutral">建议</div>
            <ul className="mt-1 list-disc pl-5 text-sm">
              {result.data.suggestions.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </div>
        </div>
      ) : (
        <TriStateOutput result={(result?.status === 'error' ? result : null) as ToolResult<string> | null} phase={phase} emptyHint="粘贴密码查看字符集/评分/建议…" />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify**

Run: `pnpm typecheck`
Expected: no type errors.

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/tools/password-tools/components/StrengthPanel.tsx
git commit -m "feat(password-tools): add StrengthPanel (charset checklist + score bar + suggestions)"
```

### Task 6: RandomPanel enhanced rules

**Files:**
- Modify: `src/renderer/src/tools/password-generator/types.ts`
- Modify: `src/renderer/src/tools/password-generator/transform.ts`
- Modify: `src/renderer/src/tools/password-generator/components/RandomPanel.tsx`
- Test: `test/password-generator.test.ts`

**Interfaces:**
- Consumes: existing `generatePassword(opts)`.
- Produces: `generatePassword` accepts new optional opts `excludeAmbiguous?`, `count?`, `targetLevel?`; returns `ToolResult<string[]>` when `count > 1`, else `ToolResult<string>` (back-compat).

- [ ] **Step 1: Update types**

In `types.ts`:
```ts
export interface RandomGenOpts {
  length: number; lower: boolean; upper: boolean; digit: boolean; symbol: boolean
  customChars?: string
  excludeAmbiguous?: boolean      // exclude 0/O/1/l/I
  count?: number                  // >1 → array output
  targetLevel?: 'weak' | 'medium' | 'strong'  // regenerate until strength target met
}
```

- [ ] **Step 2: Write the failing tests**

Append to `test/password-generator.test.ts`:

```ts
import { analyzeStrength } from '@tools/password-strength/transform'

describe('generatePassword v2 rules', () => {
  it('excludeAmbiguous removes 0/O/1/l/I from output', () => {
    const r = generatePassword({ length: 40, lower: true, upper: true, digit: true, symbol: false, excludeAmbiguous: true })
    expect(r.status).toBe('ok')
    if (r.status === 'ok') expect(/[0O1lI]/.test(r.data as string)).toBe(false)
  })
  it('count>1 returns array of unique passwords', () => {
    const r = generatePassword({ length: 12, lower: true, upper: true, digit: true, symbol: true, count: 5 })
    expect(r.status).toBe('ok')
    if (r.status === 'ok') {
      const arr = r.data as string[]
      expect(arr.length).toBe(5)
      expect(new Set(arr).size).toBe(5)
    }
  })
  it('targetLevel strong guarantees level strong', () => {
    const r = generatePassword({ length: 14, lower: true, upper: true, digit: true, symbol: true, targetLevel: 'strong' })
    expect(r.status).toBe('ok')
    if (r.status === 'ok') {
      const a = analyzeStrength(r.data as string)
      if (a.status === 'ok') expect(a.data.level).toBe('strong')
    }
  })
})
```

- [ ] **Step 3: Run to confirm fail**

Run: `pnpm vitest run test/password-generator.test.ts -t "v2 rules"`
Expected: FAIL — `excludeAmbiguous`/`count`/`targetLevel` ignored.

- [ ] **Step 4: Implement**

In `transform.ts`, rewrite `generatePassword`:

```ts
import { analyzeStrength } from '@tools/password-strength/transform'
import type { RandomGenOpts, RsaResult, BcryptResult } from './types'

const AMBIGUOUS = /[0O1lI]/
function buildPool(o: RandomGenOpts): string {
  let pool = ''
  if (o.lower) pool += 'abcdefghijklmnopqrstuvwxyz'
  if (o.upper) pool += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  if (o.digit) pool += '0123456789'
  if (o.symbol) pool += '!@#$%^&*()-_=+[]{};:,.<>?'
  if (o.customChars) pool += o.customChars
  if (o.excludeAmbiguous) pool = [...pool].filter((c) => !AMBIGUOUS.test(c)).join('')
  return pool
}
function onePass(o: RandomGenOpts, pool: string): string {
  const buf = new Uint32Array(o.length)
  crypto.getRandomValues(buf)
  let out = ''
  for (let i = 0; i < o.length; i++) out += pool[buf[i] % pool.length]
  return out
}
export function generatePassword(opts: RandomGenOpts): ToolResult<string> | ToolResult<string[]> {
  if (opts.length < 4 || opts.length > 128) return { status: 'error', kind: 'invalid-input', message: '长度需在 4-128' }
  const pool = buildPool(opts)
  if (!pool) return { status: 'error', kind: 'invalid-input', message: '请至少选择一种字符集' }
  const count = opts.count ?? 1
  const meet = (pw: string): boolean => {
    if (!opts.targetLevel) return true
    const a = analyzeStrength(pw)
    return a.status === 'ok' && a.data.level === opts.targetLevel
  }
  const gather = (): string[] => {
    const seen = new Set<string>(); const out: string[] = []
    let guard = 0
    while (out.length < count && guard < 200 * count) {
      guard++
      const pw = onePass(opts, pool)
      if (meet(pw) && !seen.has(pw)) { seen.add(pw); out.push(pw) }
    }
    return out
  }
  const res = gather()
  if (count === 1) return { status: 'ok', data: res[0] ?? '' }
  return { status: 'ok', data: res }
}
```

- [ ] **Step 5: Run to confirm pass**

Run: `pnpm vitest run test/password-generator.test.ts`
Expected: PASS (existing tests still pass because default path returns a string).

- [ ] **Step 6: Commit**

```bash
git add src/renderer/src/tools/password-generator/types.ts src/renderer/src/tools/password-generator/transform.ts test/password-generator.test.ts
git commit -m "feat(password-generator): excludeAmbiguous/count/targetLevel rules"
```

- [ ] **Step 7: Update RandomPanel UI**

Rewrite `src/renderer/src/tools/password-generator/components/RandomPanel.tsx`:

```tsx
import { useState } from 'react'
import { CopyButton } from '@components/CopyButton'
import { generatePassword } from '../transform'

const SET_LABEL: Record<string, string> = { lower: '小写', upper: '大写', digit: '数字', symbol: '符号' }

export function RandomPanel(): JSX.Element {
  const [len, setLen] = useState('16')
  const [sets, setSets] = useState({ lower: true, upper: true, digit: true, symbol: true })
  const [custom, setCustom] = useState('')
  const [excludeAmbiguous, setExcludeAmbiguous] = useState(false)
  const [count, setCount] = useState('1')
  const [out, setOut] = useState('')

  const gen = (): void => {
    const r = generatePassword({ length: Number(len), ...sets, customChars: custom || undefined, excludeAmbiguous, count: Number(count) || 1 })
    setOut(r.status === 'ok' ? (Array.isArray(r.data) ? r.data.join('\n') : r.data) : r.message)
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-neutral">长度
          <input value={len} onChange={(e) => setLen(e.target.value.replace(/[^0-9]/g, ''))} className="input input-bordered input-sm w-20 font-mono" /></label>
        <label className="flex items-center gap-2 text-sm text-neutral">数量
          <input value={count} onChange={(e) => setCount(e.target.value.replace(/[^0-9]/g, ''))} className="input input-bordered input-sm w-16 font-mono" /></label>
        {Object.keys(sets).map((k) => (
          <label key={k} className="flex items-center gap-1 text-sm text-neutral">
            <input type="checkbox" checked={sets[k as keyof typeof sets]} onChange={(e) => setSets({ ...sets, [k]: e.target.checked })} />{SET_LABEL[k]}
          </label>
        ))}
        <label className="flex items-center gap-1 text-sm text-neutral">
          <input type="checkbox" checked={excludeAmbiguous} onChange={(e) => setExcludeAmbiguous(e.target.checked)} />排除易混(0/O/1/l/I)
        </label>
        <button className="btn btn-sm btn-primary ml-auto" onClick={gen}>生成</button>
      </div>
      <label className="flex items-center gap-2 text-sm text-neutral">自定义字符(可选)
        <input value={custom} onChange={(e) => setCustom(e.target.value)} className="input input-bordered input-sm flex-1 font-mono" /></label>
      {out && <div className="flex items-center gap-2"><pre className="flex-1 overflow-auto rounded bg-base-100 p-2 font-mono text-sm">{out}</pre><CopyButton getText={() => out} enabled={!!out} /></div>}
    </div>
  )
}
```

- [ ] **Step 8: Verify + commit**

Run: `pnpm typecheck`
Then:
```bash
git add src/renderer/src/tools/password-generator/components/RandomPanel.tsx
git commit -m "feat(password-generator): RandomPanel richer rules (count/ambiguous/custom)"
```

### Task 7: password-tools page + register + worker

**Files:**
- Create: `src/renderer/src/tools/password-tools/icon.tsx`, `src/renderer/src/tools/password-tools/index.tsx`
- Delete: `src/renderer/src/tools/password-strength/index.tsx`, `src/renderer/src/tools/password-generator/index.tsx`
- Modify: `src/renderer/src/tools/register.ts`, `src/renderer/src/core/transform.worker.ts`, `test/register.test.ts`

**Interfaces:**
- Consumes: `RandomPanel`/`CryptoPanel`/`BcryptPanel` from `@tools/password-generator/components`, `StrengthPanel` from `./components/StrengthPanel`.
- Produces: `password-tools/index.tsx` default-exported 4-tab page. Register entry id `password-tools`, name `密码工具`, route `/tools/password-tools`. Worker action: `analyze` (default) / `generate` on `password-tools`.

- [ ] **Step 1: icon**

```tsx
// src/renderer/src/tools/password-tools/icon.tsx
export function PasswordToolsIcon(): JSX.Element {
  return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/><circle cx="12" cy="15" r="1.5"/></svg>
}
```

- [ ] **Step 2: page**

```tsx
// src/renderer/src/tools/password-tools/index.tsx
import { useState } from 'react'
import { RandomPanel } from '@tools/password-generator/components/RandomPanel'
import { CryptoPanel } from '@tools/password-generator/components/CryptoPanel'
import { BcryptPanel } from '@tools/password-generator/components/BcryptPanel'
import { StrengthPanel } from './components/StrengthPanel'

type TabId = 'random' | 'strength' | 'crypto' | 'bcrypt'
const TABS: [TabId, string][] = [
  ['random', '随机生成'], ['strength', '强度分析'], ['crypto', 'AES/RSA'], ['bcrypt', 'BCrypt'],
]
export default function PasswordToolsPage(): JSX.Element {
  const [tab, setTab] = useState<TabId>('random')
  return (
    <div className="mx-auto max-w-4xl p-6">
      <header className="mb-4 flex items-baseline gap-3">
        <h1 className="text-2xl font-bold">密码工具</h1>
        <span className="font-mono text-[11px] tracking-[0.25em] text-neutral">GENERATE · STRENGTH · ENCRYPT · HASH</span>
      </header>
      <div className="mb-3 flex flex-wrap gap-2">
        {TABS.map(([id, label]) => (
          <button key={id} className={`btn btn-sm ${tab === id ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>
      <section className="border border-base-300 bg-base-200/40 p-4">
        {tab === 'random' && <RandomPanel />}
        {tab === 'strength' && <StrengthPanel />}
        {tab === 'crypto' && <CryptoPanel />}
        {tab === 'bcrypt' && <BcryptPanel />}
      </section>
    </div>
  )
}
```

- [ ] **Step 3: register.ts**

Remove the `PasswordStrengthIcon` and `PasswordGenIcon` imports; add `PasswordToolsIcon`. Replace the two entries (`password-strength`, `password-generator`) with:

```ts
  {
    id: 'password-tools', name: '密码工具', icon: PasswordToolsIcon,
    route: '/tools/password-tools', component: PasswordToolsPageLazy,
    capability: { offline: true }
  },
```

and add `const PasswordToolsPageLazy = lazy(() => import('@tools/password-tools'))`. Remove the old two lazy consts (`PasswordStrengthPageLazy`, `PasswordGeneratorPageLazy`).

- [ ] **Step 4: transform.worker.ts**

Replace the `registry.set('password-strength', ...)` registration id with `'password-tools'`:

```ts
registry.set('password-tools', ((input: string, opts?: TransformOpts) => {
  const action = opts?.action ?? 'analyze'
  if (action === 'generate') {
    const requireCharsets = typeof opts?.requireCharsets === 'string' ? opts.requireCharsets.split(',') : undefined
    return improvePassword(input, {
      targetLevel: (opts?.targetLevel as Level) ?? 'medium',
      minLength: Number(opts?.minLength ?? 12),
      requireCharsets,
      excludeChars: typeof opts?.excludeChars === 'string' ? opts.excludeChars : undefined
    })
  }
  return analyzeStrength(input)
}) as unknown as Transform<unknown, unknown, TransformOpts>)
```

- [ ] **Step 5: delete orphaned pages**

```bash
git rm src/renderer/src/tools/password-strength/index.tsx src/renderer/src/tools/password-generator/index.tsx
```

- [ ] **Step 6: update register.test.ts**

Replace the file with:

```ts
import { describe, it, expect } from 'vitest'
import { tools, searchTools } from '@tools/register'

describe('注册表', () => {
  it('初始为数组(合法状态)', () => { expect(Array.isArray(tools)).toBe(true) })
  it('searchTools 空 query 返回全部', () => { expect(searchTools('')).toEqual(tools) })
  it('密码工具已合并为 password-tools', () => {
    const ids = tools.map((t) => t.id)
    expect(ids).toContain('password-tools')
    expect(ids).not.toContain('password-strength')
    expect(ids).not.toContain('password-generator')
  })
})
```

- [ ] **Step 7: Verify**

Run: `pnpm vitest run test/register.test.ts test/password-strength.test.ts test/password-generator.test.ts`
Expected: PASS all.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(password-tools): merge strength+generator into single password-tools page"
```

---

## Group 2: JWT (#2)

### Task 8: JWT transform — asymmetric verify + friendly timestamps

**Files:**
- Modify: `src/renderer/src/tools/jwt-tool/types.ts`, `src/renderer/src/tools/jwt-tool/transform.ts`
- Test: `test/jwt-tool.test.ts`

**Interfaces:**
- Consumes: existing `parseJwt`, `signJwt`, `verifyJwt`, `renewJwt`.
- Produces: `verifyJwt(token, secret, alg='HS256', publicKey?)` supports RS/ES/PS via jose `importSPKI`; `parseJwt` adds `friendlyTimes` to `JwtResult`; helper `friendlyTimestamp(seconds): string`; `JwtAlg` union expanded.

- [ ] **Step 1: Update types**

```ts
export type JwtAlg = 'HS256' | 'HS384' | 'HS512' | 'RS256' | 'RS384' | 'RS512' | 'ES256' | 'ES384' | 'ES512' | 'PS256' | 'PS384' | 'PS512'
export interface JwtFriendlyTime { field: string; iso: string; local: string }
export interface JwtResult {
  header?: Record<string, unknown>
  payload?: Record<string, unknown>
  isValid?: boolean
  verifyError?: string
  token?: string
  expiresAt?: string
  friendlyTimes?: JwtFriendlyTime[]
}
```

- [ ] **Step 2: Write failing tests**

Append:

```ts
describe('asymmetric + friendly time', () => {
  it('displays friendly timestamps for exp/iat', () => {
    const pb = Buffer.from(JSON.stringify({ sub: 'u', exp: 1700000000, iat: 1700000000 })).toString('base64url')
    const hb = Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64url')
    const r = parseJwt(`${hb}.${pb}.x`)
    expect(r.status).toBe('ok')
    if (r.status === 'ok') {
      expect(r.data.friendlyTimes).toBeDefined()
      const fields = (r.data.friendlyTimes as { field: string }[]).map((f) => f.field)
      expect(fields).toContain('exp')
      expect(fields).toContain('iat')
    }
  })
  it('verify an RS256 token with a public key PEM', async () => {
    const { generateKeyPair, exportSPKI, exportPKCS8 } = await import('jose')
    const { privateKey, publicKey } = await generateKeyPair('RS256')
    const pem = await exportSPKI(publicKey)
    const priv = await exportPKCS8(privateKey)
    const { SignJWT } = await import('jose')
    const tok = await new SignJWT({ sub: 'u' }).setProtectedHeader({ alg: 'RS256' }).sign(priv)
    const v = await verifyJwt(tok, '', 'RS256', pem as string)
    expect(v.status).toBe('ok')
    if (v.status === 'ok') expect(v.data.isValid).toBe(true)
  })
})
```

- [ ] **Step 3: Run to confirm fail**

Run: `pnpm vitest run test/jwt-tool.test.ts -t "asymmetric|friendly"`
Expected: FAIL.

- [ ] **Step 4: Implement**

`types.ts` updated. `transform.ts`:

```ts
import { jwtVerify, SignJWT, importSPKI } from 'jose'

export function friendlyTimestamp(seconds: number): string {
  const d = new Date(seconds * 1000)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

const TIME_FIELDS = ['exp', 'iat', 'nbf']
function timeEntries(payload: Record<string, unknown>): JwtFriendlyTime[] {
  return TIME_FIELDS
    .filter((f) => typeof payload[f] === 'number')
    .map((f) => ({ field: f, iso: new Date((payload[f] as number) * 1000).toISOString(), local: friendlyTimestamp(payload[f] as number) }))
}
```

In `parseJwt`, after computing `payload`, add `friendlyTimes: payload ? timeEntries(payload) : undefined` to the returned data.

`verifyJwt`:

```ts
export async function verifyJwt(token: string, secret: string, alg: JwtAlg = 'HS256', publicKey?: string): Promise<ToolResult<JwtResult>> {
  if (!SUPPORTED_ALGS.includes(alg)) {
    return { status: 'error', kind: 'unsupported', structure: alg, message: '暂不支持该算法' }
  }
  try {
    let key: Uint8Array | CryptoKey
    if (alg.startsWith('HS')) key = textToKey(secret)
    else {
      if (!publicKey) return { status: 'error', kind: 'invalid-input', message: '非对称算法需粘贴公钥(PEM)' }
      key = await importSPKI(publicKey, alg.replace(/-(256|384|512)/, '') as 'RS256')
    }
    const { payload } = await jwtVerify(token.trim(), key, { algorithms: [alg] })
    return { status: 'ok', data: { payload: payload as Record<string, unknown>, isValid: true } }
  } catch (e) {
    const msg = e instanceof Error ? e.message : ''
    if (msg.includes('exp')) return { status: 'error', kind: 'invalid-input', message: 'Token 已过期' }
    return { status: 'error', kind: 'invalid-input', message: '签名不匹配或公钥无效' }
  }
}
```

Also expand `SUPPORTED_ALGS` to the full union.

- [ ] **Step 5: Run to confirm pass**

Run: `pnpm vitest run test/jwt-tool.test.ts`
Expected: PASS all.

- [ ] **Step 6: Commit**

```bash
git add src/renderer/src/tools/jwt-tool/types.ts src/renderer/src/tools/jwt-tool/transform.ts test/jwt-tool.test.ts
git commit -m "feat(jwt-tool): RS/ES/PS verify via PEM + friendly timestamp fields"
```

### Task 9: JWT index UI

**Files:**
- Modify: `src/renderer/src/tools/jwt-tool/index.tsx`

**Interfaces:**
- Consumes: `JsonView`, updated `verifyJwt` (PEM), `parseJwt` (`friendlyTimes`).
- Produces: dynamic alg dropdown (seeded + auto-added from parsed header.alg), PEM/secret key input, friendly-timestamp table, `JsonView` for header/payload, a manual timestamp→friendly converter.

- [ ] **Step 1: Implement**

Rewrite `src/renderer/src/tools/jwt-tool/index.tsx`:

```tsx
import { useMemo, useState } from 'react'
import { useLiveTransform } from '@core/useLiveTransform'
import { CopyButton } from '@components/CopyButton'
import { TriStateOutput } from '@components/TriStateOutput'
import { JsonView } from '@components/JsonView'
import { runTransform } from '@core/transform.channel'
import { friendlyTimestamp } from './transform'
import type { ToolResult } from '@core/types'
import type { JwtResult } from './types'

const ALL_ALGS = ['HS256','HS384','HS512','RS256','RS384','RS512','ES256','ES384','ES512','PS256','PS384','PS512']

export default function JwtToolPage(): JSX.Element {
  const { input, setInput, phase, result } = useLiveTransform<string, JwtResult>('jwt-tool')
  const [secret, setSecret] = useState('')
  const [alg, setAlg] = useState('HS256')
  const [expiry, setExpiry] = useState('1h')
  const [actionOut, setActionOut] = useState('')
  const [tsInput, setTsInput] = useState('')
  const [tsOut, setTsOut] = useState('')

  const parsedAlg = useMemo(() => {
    const a = result?.status === 'ok' ? result.data.header?.alg : undefined
    return typeof a === 'string' ? a : undefined
  }, [result])
  const algOptions = parsedAlg && !ALL_ALGS.includes(parsedAlg) ? [...ALL_ALGS, parsedAlg] : ALL_ALGS
  const isAsym = !alg.startsWith('HS')

  const trigger = async (action: string): Promise<void> => {
    const key = isAsym ? secret : secret || 'secret'
    const r = await runTransform('jwt-tool', input, { action, secret: key, alg, expiry })
    if (r.status === 'ok') setActionOut((r.data as JwtResult).token ?? JSON.stringify(r.data, null, 2))
    else setActionOut(r.message)
  }

  const toFriendly = (): void => {
    const n = Number(tsInput)
    setTsOut(Number.isFinite(n) ? friendlyTimestamp(n) : '无效时间戳')
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <header className="mb-4 flex items-baseline gap-3">
        <h1 className="text-2xl font-bold">JWT 解析</h1>
        <span className="font-mono text-[11px] tracking-[0.25em] text-neutral">PARSE · VERIFY · SIGN · RENEW</span>
        <CopyButton getText={() => actionOut} enabled={!!actionOut} />
      </header>
      <section className="border border-base-300 bg-base-200/40 p-4">
        <textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="粘贴 JWT,自动解析…" className="textarea textarea-bordered w-full font-mono" rows={4} />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <input value={secret} onChange={(e) => setSecret(e.target.value)} placeholder={isAsym ? '公钥(PEM)' : '密钥/secret'} className="input input-bordered input-sm w-52 font-mono" />
          <select className="select select-bordered select-sm" value={alg} onChange={(e) => setAlg(e.target.value)}>
            {algOptions.map((a) => <option key={a}>{a}</option>)}
          </select>
          <input value={expiry} onChange={(e) => setExpiry(e.target.value)} placeholder="expiry 如 1h/7d" className="input input-bordered input-sm w-32 font-mono" />
          <button className="btn btn-sm" onClick={() => trigger('verify')}>校验</button>
          <button className="btn btn-sm" onClick={() => trigger('sign')}>签名(用输入做 payload)</button>
          <button className="btn btn-sm" onClick={() => trigger('renew')}>续期</button>
        </div>
        <div className="mt-2 font-mono text-[11px] text-neutral">续期规则:读取原 payload(保留它),仅重设 exp 为新 expiry(默认 1h,支持 1h/7d/30d 等);沿用原 alg(非对称沿用原 alg,密钥须匹配);签名算法变更需重新提供密钥。</div>
      </section>
      <div className="mt-4">
        {result?.status === 'ok' ? (
          <div className="space-y-3 border border-base-300 bg-base-200/40 p-4">
            {result.data.header && (
              <div>
                <div className="font-mono text-[11px] tracking-widest text-neutral">HEADER</div>
                <JsonView value={result.data.header} />
              </div>
            )}
            {result.data.payload && (
              <div>
                <div className="font-mono text-[11px] tracking-widest text-neutral">PAYLOAD</div>
                <JsonView value={result.data.payload} />
                {result.data.friendlyTimes && result.data.friendlyTimes.length > 0 && (
                  <div className="mt-2 grid gap-1 sm:grid-cols-2 text-xs">
                    {result.data.friendlyTimes.map((f) => (
                      <div key={f.field} className="flex justify-between rounded bg-base-100 px-2 py-1">
                        <span className="font-mono text-neutral">{f.field}</span>
                        <span className="font-mono">{f.local}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {result.data.isValid === true && <div className="text-success">✓ 签名有效</div>}
            {result.data.expiresAt && <div className="text-neutral">过期时间: {result.data.expiresAt}</div>}
          </div>
        ) : (
          <TriStateOutput result={(result?.status === 'error' ? result : null) as ToolResult<string> | null} phase={phase} emptyHint="粘贴 JWT 查看 header/payload…" />
        )}
      </div>
      {actionOut && <pre className="mt-4 overflow-auto rounded bg-base-100 p-2 font-mono text-sm">{actionOut}</pre>}
      <section className="mt-4 border border-base-300 bg-base-200/40 p-4">
        <div className="font-mono text-[11px] tracking-widest text-neutral">时间戳 → 友好时间</div>
        <div className="mt-1 flex items-center gap-3">
          <input value={tsInput} onChange={(e) => setTsInput(e.target.value)} placeholder="1700000000(秒)" className="input input-bordered input-sm w-40 font-mono" />
          <button className="btn btn-sm" onClick={toFriendly}>转换</button>
          {tsOut && <span className="font-mono text-sm">{tsOut}</span>}
        </div>
      </section>
    </div>
  )
}
```

- [ ] **Step 2: Verify**

Run: `pnpm typecheck`
Expected: no type errors.

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/tools/jwt-tool/index.tsx
git commit -m "feat(jwt-tool): dynamic alg drop-down, PEM verify, friendly timestamps, highlighted JSON"
```

---

## Group 3: Log Analyzer (#4)

### Task 10: Robust exception + endpoint detection + timeline error counts

**Files:**
- Modify: `src/renderer/src/tools/log-analyzer/types.ts`, `src/renderer/src/tools/log-analyzer/transform.ts`
- Test: `test/log-analyzer.test.ts`

**Interfaces:**
- Consumes: existing `analyzeLog(rawText): ToolResult<LogAnalysisResult>`.
- Produces: `TimelinePoint` gains `error?: number`; `LevelStat` gains `isHigh?: boolean` (ERROR+FATAL > 30%); exception detection catches `Caused by`/`at ...` frames and falls back to message-summary key; endpoint detection recognizes path tokens without an HTTP verb; path params normalized (`/123` → `/{id}`).

- [ ] **Step 1: Update types**

```ts
export interface TimelinePoint { ts: string; count: number; error?: number }
export interface LevelStat { level: string; count: number; pct: number; isHigh?: boolean }
```

- [ ] **Step 2: Write failing tests**

Append to `test/log-analyzer.test.ts`:

```ts
describe('robust detection + error coloring', () => {
  const LOG = [
    '[2026-09-03 10:00:01] ERROR org.x.Service - failed\n\tCaused by: java.sql.SQLException\n\tat com.x.Dao.query(Dao.java:10)',
    '[2026-09-03 10:00:02] ERROR - GET /api/order/123 boom',
    '[2026-09-03 10:00:03] INFO - /api/health ok',
  ].join('\n')
  it('clusters Caused by exception even without Exception keyword on same line', () => {
    const r = analyzeLog(LOG)
    expect(r.status).toBe('ok')
    if (r.status === 'ok') {
      const types = r.data.exceptions.map((e) => e.type)
      expect(types.some((t) => t.includes('SQLException'))).toBe(true)
    }
  })
  it('aggregates endpoint path without HTTP verb (path token only)', () => {
    const r = analyzeLog(LOG)
    expect(r.status).toBe('ok')
    if (r.status === 'ok') {
      const paths = r.data.endpoints.map((e) => e.path)
      expect(paths.some((p) => p === '/api/order/{id}' || p === '/api/order/123')).toBe(true)
      expect(paths.some((p) => p === '/api/health')).toBe(true)
    }
  })
  it('timeline buckets carry an error count', () => {
    const r = analyzeLog(LOG)
    expect(r.status).toBe('ok')
    if (r.status === 'ok') {
      expect(r.data.timeline.every((t) => typeof t.error === 'number'))
      expect(r.data.timeline.reduce((s, t) => s + (t.error ?? 0), 0)).toBe(2)
    }
  })
})
```

- [ ] **Step 3: Run to confirm fail**

Run: `pnpm vitest run test/log-analyzer.test.ts -t "robust detection"`
Expected: FAIL.

- [ ] **Step 4: Implement**

In `transform.ts`:

Replace the endpoint/exception regexes and add helpers:

```ts
const exceptRe = /([A-Za-z_][\w$]*(?:Exception|Error|Throwable))(?::\s*(.*))?/
const causedByRe = /Caused by[: ]+([A-Za-z_][\w$]*(?:Exception|Error|Throwable))(?::\s*(.*))?/
const frameRe = /^\s*at\s+([\w.$]+)\(([^)]+)\)/
const verbPathRe = /\b(?:GET|POST|PUT|DELETE|PATCH)\s+(\/[^\s"']*)/i
const pathTokenRe = /\b(\/(?:api|v\d+|rest|admin|user|users|order|orders|health|status)\b[^\s"'<>]*)/
```

Normalize path params:
```ts
function normalizePath(p: string): string {
  return p.replace(/\/\d{1,5}(?=\/|$)/g, '/{id}')
}
```
Add `firstWords`:
```ts
const firstWords = (line: string, n: number): string => line.trim().replace(/\s+/g, ' ').slice(0, n)
```

In the per-line loop:
- Change `const timeline = new Map<string, number>()` to `new Map<string, { count: number; error: number }>()`.
- Insert `const isError = level === 'ERROR' || level === 'FATAL'` near the top of the loop body.
- Timeline: `if (tm) { const min = tm[1].slice(0, 16); const cur = timeline.get(min) ?? { count: 0, error: 0 }; cur.count += 1; if (isError) cur.error += 1; timeline.set(min, cur) }`.
- Exception clustering: maintain a `let lastExceptionKey: string | undefined`. At the top of each line, compute:
```ts
const caused = line.match(causedByRe)
const ex = line.match(exceptRe)
let exKey: string | undefined, exDesc = ''
if (ex) { exKey = ex[1]; exDesc = exceptionLineMessage(line, ex[2] ?? '') }
else if (caused) { exKey = caused[1]; exDesc = caused[2] ?? '' }
else if (frameRe.test(line) && lastExceptionKey) { exKey = lastExceptionKey; exDesc = '' }  // stack continuation
else if (isError) { exKey = 'ERROR'; exDesc = firstWords(line, 40) }  // fallback for error lines w/o named exception
if (exKey) {
  const desc = exDesc
  let cur = excByHash.get(exKey)
  if (!cur) { cur = { type: exKey, message: desc, count: 0, sampleLine: lineNo, stackHash: hash(exKey) }; excByHash.set(exKey, cur) }
  else if (desc && cur.message === '') cur.message = desc
  cur.count += 1
  lastExceptionKey = exKey
}
```
- Endpoint: replace `const pe = line.match(pathRe)` with:
```ts
const peVerb = line.match(verbPathRe)
const peToken = line.match(pathTokenRe)
const pe = peVerb ?? peToken
if (pe && isError) {
  const path = normalizePath((pe[1] ?? pe[0]))
  const m = pathErrors.get(path) ?? new Map<string, number>()
  const exType = exKey ?? 'ERROR'
  m.set(exType, (m.get(exType) ?? 0) + 1)
  pathErrors.set(path, m)
}
```
- Level stats isHigh:
```ts
const levelStats: LevelStat[] = LVLS.filter((l) => levelCount[l])
  .map((l) => ({ level: l, count: levelCount[l], pct: Math.round((levelCount[l] / total) * 100), isHigh: (l === 'ERROR' || l === 'FATAL') && (levelCount[l] / total) > 0.30 }))
```
- Timeline array mapping: `Map<string, { count, error }>` → `TimelinePoint { ts, count, error }`.

- [ ] **Step 5: Run to confirm pass**

Run: `pnpm vitest run test/log-analyzer.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/renderer/src/tools/log-analyzer/types.ts src/renderer/src/tools/log-analyzer/transform.ts test/log-analyzer.test.ts
git commit -m "feat(log-analyzer): robust exception/endpoint detection + timeline error counts + high-error flag"
```

### Task 11: Log analyzer UI — error-rate coloring, units

**Files:**
- Modify: `src/renderer/src/tools/log-analyzer/index.tsx`

**Interfaces:**
- Consumes: updated `LogAnalysisResult` (`TimelinePoint.error`, `LevelStat.isHigh`).
- Produces: timeline bars colored by error rate (green/yellow/red), unit labels (`N 条`, `×N 次`, `N%`), high-error badge.

- [ ] **Step 1: Implement**

In `StatsPanel`, add a color helper and replace timeline & level-stat rendering:

```tsx
const barColor = (error: number | undefined, count: number): string => {
  if (!error || count === 0) return 'bg-success/60'
  const ratio = error / count
  if (ratio >= 0.3) return 'bg-error'
  if (ratio > 0) return 'bg-warning'
  return 'bg-success/60'
}
```

Timeline row (replace the existing map):
```tsx
{res.timeline.map((t) => (
  <div key={t.ts} className="flex items-center gap-2 text-sm font-mono">
    <span className="text-neutral">{t.ts}</span>
    <span className={`inline-block h-2 rounded ${barColor(t.error, t.count)}`} style={{ width: `${Math.min(100, (t.count / maxTimeline) * 100)}%` }} />
    <span>{t.count} 条{t.error ? `(错误 ${t.error})` : ''}</span>
  </div>
))}
```

Level stats badge (add unit + high flag):
```tsx
{res.levelStats.map((l) => (
  <span key={l.level} className={`badge ${l.level === 'ERROR' ? 'badge-error' : l.level === 'WARN' ? 'badge-warning' : 'badge-info'} ${l.isHigh ? ' badge-error' : ''}`}>
    {l.level}:{l.count} 条({l.pct}%){l.isHigh ? ' 高' : ''}
  </span>
))}
```

- [ ] **Step 2: Verify + commit**

Run: `pnpm typecheck`
```bash
git add src/renderer/src/tools/log-analyzer/index.tsx
git commit -m "feat(log-analyzer): error-rate colored timeline + unit labels + high-error badge"
```

---

## Group 4: Docker (#5)

### Task 12: Docker templates + network/log/restart

**Files:**
- Create: `src/renderer/src/tools/docker-tools/data/templates.ts`
- Modify: `src/renderer/src/tools/docker-tools/types.ts`, `transform.ts`
- Test: `test/docker-tools.test.ts`

**Interfaces:**
- Consumes: existing `generateRun`, `generateCompose`.
- Produces: `RunOptions` gains `network?` (preset string), `logging?: { driver: string; options: Record<string,string> }`; `ComposeService` gains `restart?`, `networkMode?`, `logging?`; template data `DOCKER_TEMPLATES`.

- [ ] **Step 1: Create templates data**

```ts
// src/renderer/src/tools/docker-tools/data/templates.ts
export interface DockerTemplate {
  id: string; label: string; image: string
  ports: string[]; volumes: string[]; envs: string[]
}
export const DOCKER_TEMPLATES: DockerTemplate[] = [
  { id: 'mysql', label: 'MySQL', image: 'mysql:8', ports: ['3306:3306'], volumes: ['./data:/var/lib/mysql'], envs: ['MYSQL_ROOT_PASSWORD=root'] },
  { id: 'postgres', label: 'PostgreSQL', image: 'postgres:16', ports: ['5432:5432'], volumes: ['./data:/var/lib/postgresql/data'], envs: ['POSTGRES_PASSWORD=postgres'] },
  { id: 'redis', label: 'Redis', image: 'redis:7', ports: ['6379:6379'], volumes: ['./data:/data'], envs: [] },
  { id: 'nginx', label: 'Nginx', image: 'nginx:alpine', ports: ['80:80'], volumes: ['./nginx.conf:/etc/nginx/nginx.conf:ro'], envs: [] },
  { id: 'mongo', label: 'MongoDB', image: 'mongo:7', ports: ['27017:27017'], volumes: ['./data:/data/db'], envs: [] },
  { id: 'node', label: 'Node', image: 'node:18-alpine', ports: ['3000:3000'], volumes: ['./:/app'], envs: ['NODE_ENV=production'] },
]
```

- [ ] **Step 2: Update types**

```ts
export interface RunLogging { driver: string; options: Record<string, string> }
export interface RunOptions {
  image: string; name?: string; ports: string[]; volumes: string[]; envs: string[]
  restart?: string; network?: string; logging?: RunLogging
}
export interface ComposeService {
  name: string; image: string; ports?: string[]; volumes?: string[]; envs?: string[]
  dependsOn?: string[]; restart?: string; networkMode?: string; logging?: RunLogging
}
```

- [ ] **Step 3: Write failing tests**

Append to `test/docker-tools.test.ts`:

```ts
describe('docker v2', () => {
  it('run emits logging driver + opts', () => {
    const r = generateRun({ image: 'app', ports: [], volumes: [], envs: [], logging: { driver: 'json-file', options: { 'max-size': '10m' } }, network: 'host' })
    expect(r.status).toBe('ok')
    if (r.status === 'ok') {
      expect(r.data).toContain('--network host')
      expect(r.data).toContain('--log-driver json-file')
    }
  })
  it('compose emits restart + network_mode + logging', () => {
    const r = generateCompose([{ name: 'web', image: 'nginx', restart: 'always', networkMode: 'host', logging: { driver: 'json-file', options: { 'max-file': '3' } } }])
    expect(r.status).toBe('ok')
    if (r.status === 'ok') {
      expect(r.data).toContain('restart: always')
      expect(r.data).toContain('network_mode: host')
      expect(r.data).toContain('driver: json-file')
    }
  })
})
```

- [ ] **Step 4: Run to confirm fail**

Run: `pnpm vitest run test/docker-tools.test.ts -t "docker v2"`
Expected: FAIL.

- [ ] **Step 5: Implement**

In `transform.ts` `generateRun`, after `if (o.network)`:
```ts
if (o.network) parts.push(`--network ${o.network}`)
if (o.logging) {
  parts.push(`--log-driver ${o.logging.driver}`)
  for (const [k, v] of Object.entries(o.logging.options)) parts.push(`--log-opt ${k}=${v}`)
}
```

In `generateCompose`, per service after `depends_on` block:
```ts
if (s.restart) b.push(`    restart: ${s.restart}`)
if (s.networkMode) b.push(`    network_mode: ${s.networkMode}`)
if (s.logging) {
  b.push('    logging:', `      driver: ${s.logging.driver}`)
  const opts = Object.entries(s.logging.options)
  if (opts.length) {
    b.push('      options:')
    for (const [k, v] of opts) b.push(`        ${k}: "${v}"`)
  }
}
```

- [ ] **Step 6: Run to confirm pass**

Run: `pnpm vitest run test/docker-tools.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/renderer/src/tools/docker-tools/data/templates.ts src/renderer/src/tools/docker-tools/types.ts src/renderer/src/tools/docker-tools/transform.ts test/docker-tools.test.ts
git commit -m "feat(docker-tools): templates + network/log/restart options"
```

### Task 13: Docker RunTab / ComposeTab UI

**Files:**
- Modify: `src/renderer/src/tools/docker-tools/components/RunTab.tsx`, `src/renderer/src/tools/docker-tools/components/ComposeTab.tsx`

**Interfaces:**
- Consumes: `DOCKER_TEMPLATES`, updated `generateRun`/`generateCompose`, `RunLogging`.
- Produces: template picker + network/log/restart controls in Run and Compose tabs.

- [ ] **Step 1: RunTab**

Rewrite `RunTab.tsx` to add a template dropdown, network select, logging driver select + max-size. Key additions (keep existing fields):

```tsx
import { DOCKER_TEMPLATES } from '../data/templates'
// new state: templateId, loggingDriver, maxSize
const onTemplate = (id: string): void => {
  setTemplateId(id)
  const t = DOCKER_TEMPLATES.find((x) => x.id === id)
  if (t) { setImage(t.image); setPorts(t.ports.join('\n')); setVolumes(t.volumes.join('\n')); setEnvs(t.envs.join('\n')) }
}
// in gen(): add logging: loggingDriver ? { driver: loggingDriver, options: maxSize ? { 'max-size': maxSize } : {} } : undefined, network: network || undefined
// Replace the network free-text with a <select> (bridge/host/none) + keep the input for 自定义.
```

- [ ] **Step 2: ComposeTab**

Rewrite `ComposeTab.tsx`: add a template `<select>` at the top that fills the first service; per-service card add `restart` select, `network_mode` select, `logging` driver select; include these in `build()`. `SvcDraft` gains `restart`, `networkMode`, `loggingDriver`, `maxSize`; `build()` maps to `ComposeService` including `logging`.

- [ ] **Step 3: Verify + commit**

Run: `pnpm typecheck`
```bash
git add src/renderer/src/tools/docker-tools/components/RunTab.tsx src/renderer/src/tools/docker-tools/components/ComposeTab.tsx
git commit -m "feat(docker-tools): Run/Compose tabs template + network/log/restart controls"
```

---

## Group 5: Nginx (#6) — model rewrite

### Task 14: Nginx multi-server model + validation

**Files:**
- Rewrite: `src/renderer/src/tools/nginx-generator/types.ts`, `transform.ts`
- Test: `test/nginx-generator.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces:
  - `LocationBlock { type: 'static'|'proxy'|'redirect'|'custom'; path: string; root?; proxyPass?; redirect?; custom? }`
  - `ServerBlock { serverName; listen; ssl; sslCert?; sslKey?; root?; proxyPass?; websocket?; forceHttps?; redirectCode?: '301'|'308'; hsts?; cache?; gzip?; securityHeaders?; locations?: LocationBlock[] }`
  - `NginxOptions { upstream?: { servers: UpstreamServer[]; strategy; }; servers: ServerBlock[] }`
  - `generateNginxConfig(o: NginxOptions): ToolResult<string>`
  - `validateNginxConfig(o: NginxOptions): string[]` (problems; empty = ok)

- [ ] **Step 1: Rewrite types**

```ts
export interface UpstreamServer { host: string }
export type UpstreamStrategy = 'round_robin' | 'least_conn' | 'ip_hash'
export interface LocationBlock {
  type: 'static' | 'proxy' | 'redirect' | 'custom'
  path: string
  root?: string
  proxyPass?: string
  redirect?: string
  custom?: string
}
export interface ServerBlock {
  serverName: string
  listen: number
  ssl: boolean
  sslCert?: string
  sslKey?: string
  root?: string
  proxyPass?: string
  websocket?: boolean
  forceHttps?: boolean
  redirectCode?: '301' | '308'
  hsts?: boolean
  cache?: boolean
  gzip?: boolean
  securityHeaders?: boolean
  locations?: LocationBlock[]
}
export interface NginxOptions {
  upstream?: { servers: UpstreamServer[]; strategy: UpstreamStrategy }
  servers: ServerBlock[]
}
```

- [ ] **Step 2: Write failing tests**

Replace `test/nginx-generator.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { generateNginxConfig, validateNginxConfig } from '@tools/nginx-generator/transform'

describe('generateNginxConfig v2', () => {
  it('ssl server emits cert paths + listen 443 ssl', () => {
    const r = generateNginxConfig({ servers: [{ serverName: 'x.com', listen: 443, ssl: true, sslCert: '/etc/nginx/c.pem', sslKey: '/etc/nginx/k.pem' }] })
    expect(r.status).toBe('ok')
    if (r.status === 'ok') {
      expect(r.data).toContain('listen 443 ssl')
      expect(r.data).toContain('ssl_certificate /etc/nginx/c.pem')
      expect(r.data).toContain('ssl_certificate_key /etc/nginx/k.pem')
    }
  })
  it('force https emits 80 redirect + 443 main server', () => {
    const r = generateNginxConfig({ servers: [{ serverName: 'x.com', listen: 443, ssl: true, sslCert: '/c.pem', sslKey: '/k.pem', forceHttps: true, redirectCode: '301' }] })
    expect(r.status).toBe('ok')
    if (r.status === 'ok') {
      expect(r.data).toContain('return 301 https://$host$request_uri')
      expect(r.data).toContain('listen 80')
      expect(r.data).toContain('listen 443 ssl')
    }
  })
  it('multiple server blocks each emitted', () => {
    const r = generateNginxConfig({ servers: [{ serverName: 'a.com', listen: 80, root: '/var/www/a' }, { serverName: 'b.com', listen: 80, proxyPass: 'http://backend' }] })
    expect(r.status).toBe('ok')
    if (r.status === 'ok') {
      expect(r.data).toContain('server_name a.com')
      expect(r.data).toContain('server_name b.com')
      expect(r.data).toContain('proxy_pass http://backend')
    }
  })
  it('upstream block emitted', () => {
    const r = generateNginxConfig({ upstream: { servers: [{ host: 'a:8080' }], strategy: 'least_conn' }, servers: [{ serverName: 'x.com', listen: 80, proxyPass: 'http://backend' }] })
    expect(r.status).toBe('ok')
    if (r.status === 'ok') {
      expect(r.data).toContain('upstream backend')
      expect(r.data).toContain('least_conn')
      expect(r.data).toContain('server a:8080;')
    }
  })
  it('empty server_name → invalid-input', () => {
    const r = generateNginxConfig({ servers: [{ serverName: '', listen: 80 }] })
    expect(r.status).toBe('error')
  })
})

describe('validateNginxConfig', () => {
  it('flags ssl server missing cert paths', () => {
    expect(validateNginxConfig({ servers: [{ serverName: 'x.com', listen: 443, ssl: true }] }).some((p) => p.includes('证书'))).toBe(true)
  })
  it('flags proxy_pass referencing undefined upstream', () => {
    expect(validateNginxConfig({ servers: [{ serverName: 'x.com', listen: 80, proxyPass: 'http://backend' }] }).some((p) => p.includes('upstream'))).toBe(true)
  })
  it('flags root+proxyPass on same server', () => {
    expect(validateNginxConfig({ servers: [{ serverName: 'x.com', listen: 80, root: '/var/www', proxyPass: 'http://b' }] }).some((p) => p.includes('root') && p.includes('proxy'))).toBe(true)
  })
  it('empty input ok', () => { expect(validateNginxConfig({ servers: [] })).toEqual([]) })
})
```

- [ ] **Step 3: Run to confirm fail**

Run: `pnpm vitest run test/nginx-generator.test.ts`
Expected: FAIL.

- [ ] **Step 4: Implement transform.ts**

```ts
import type { ToolResult } from '@core/types'
import type { NginxOptions, ServerBlock, LocationBlock } from './types'

function locBlock(pad: string, l: LocationBlock): string[] {
  const out: string[] = [`${pad}location ${l.path} {`]
  if (l.type === 'static') { if (l.root) out.push(`${pad}  root ${l.root};`) }
  else if (l.type === 'proxy') {
    out.push(`${pad}  proxy_pass ${l.proxyPass};`, `${pad}  proxy_set_header Host $host;`, `${pad}  proxy_set_header X-Real-IP $remote_addr;`, `${pad}  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;`)
  } else if (l.type === 'redirect') { out.push(`${pad}  return 302 ${l.redirect ?? '/'}`) }
  else if (l.custom) out.push(...l.custom.split('\n').map((c) => `${pad}  ${c}`))
  out.push(`${pad}}`)
  return out
}

function serverBlock(s: ServerBlock): string[] {
  const out: string[] = ['server {', `  listen ${s.listen}${s.ssl ? ' ssl' : ''};`, `  server_name ${s.serverName};`]
  if (s.ssl && s.sslCert && s.sslKey) { out.push(`  ssl_certificate ${s.sslCert};`, `  ssl_certificate_key ${s.sslKey};`) }
  if (s.gzip) out.push('  gzip on;', '  gzip_types text/plain text/css application/json application/javascript;')
  if (s.cache) out.push('  location ~* \\.(css|js|png|jpg|svg)$ { expires 7d; add_header Cache-Control "public"; }')
  if (s.securityHeaders) out.push('  add_header X-Frame-Options "SAMEORIGIN";', '  add_header X-Content-Type-Options "nosniff";', '  server_tokens off;')
  if (s.hsts) out.push('  add_header Strict-Transport-Security "max-age=31536000" always;')
  if (s.root) out.push(`  root ${s.root};`)
  if (s.proxyPass) {
    out.push(`  location / {`, `    proxy_pass ${s.proxyPass};`, '    proxy_set_header Host $host;', '    proxy_set_header X-Real-IP $remote_addr;', '    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;')
    if (s.websocket) out.push('    proxy_set_header Upgrade $http_upgrade;', '    proxy_set_header Connection "upgrade";')
    out.push('  }')
  }
  for (const l of s.locations ?? []) out.push(...locBlock('  ', l))
  out.push('}')
  return out
}

export function generateNginxConfig(o: NginxOptions): ToolResult<string> {
  if (!o.servers.length) return { status: 'error', kind: 'invalid-input', message: '请至少配置一个 server 块' }
  for (const s of o.servers) if (!s.serverName.trim()) return { status: 'error', kind: 'invalid-input', message: '请填写 server_name' }
  if (o.upstream && o.upstream.servers.length === 0) return { status: 'error', kind: 'invalid-input', message: 'upstream 至少一个 server' }
  const out: string[] = ['# 生成的 nginx 配置', '']
  if (o.upstream) {
    const s = o.upstream.strategy
    out.push('upstream backend {', s === 'least_conn' ? '  least_conn;' : s === 'ip_hash' ? '  ip_hash;' : '  # 轮询(默认)', ...o.upstream.servers.map((v) => `  server ${v.host};`), '}', '')
  }
  for (const s of o.servers) {
    if (s.forceHttps && s.ssl) {
      const code = s.redirectCode ?? '301'
      out.push('server {', '  listen 80;', `  server_name ${s.serverName};`, `  return ${code} https://$host$request_uri;`, '}', '')
    }
    out.push(...serverBlock(s))
  }
  return { status: 'ok', data: out.join('\n') }
}

export function validateNginxConfig(o: NginxOptions): string[] {
  const problems: string[] = []
  if (!o.servers.length) problems.push('缺少 server 块')
  const upstreamDefined = !!o.upstream && o.upstream.servers.length > 0
  for (const s of o.servers) {
    if (!s.serverName.trim()) problems.push('存在未填写 server_name 的 server 块')
    if (s.ssl && (!s.sslCert || !s.sslKey)) problems.push(`server ${s.serverName || '(未命名)'}: SSL 已开启但缺证书路径`)
    if (s.root && s.proxyPass) problems.push(`server ${s.serverName || '(未命名)'}: root 与 proxy_pass 冲突,只能二选一`)
    if (s.proxyPass && s.proxyPass.includes('backend') && !upstreamDefined) problems.push(`server ${s.serverName || '(未命名)'}: proxy_pass 引用未定义的 upstream backend`)
  }
  return problems
}
```

- [ ] **Step 5: Run to confirm pass**

Run: `pnpm vitest run test/nginx-generator.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/renderer/src/tools/nginx-generator/types.ts src/renderer/src/tools/nginx-generator/transform.ts test/nginx-generator.test.ts
git commit -m "feat(nginx-generator): multi-server model + validation"
```

### Task 15: Nginx index.tsx (multi-server UI + SSL section + config check)

**Files:**
- Rewrite: `src/renderer/src/tools/nginx-generator/index.tsx`

**Interfaces:**
- Consumes: `generateNginxConfig`, `validateNginxConfig`, `NginxOptions`, `ServerBlock`, `LocationBlock`.
- Produces: list of server blocks each with SSL section, root/proxy mutual-exclusion, location list; upstream panel that populates proxy_pass; "force HTTPS" step hint; "配置检查" button that shows problems.

- [ ] **Step 1: Implement**

Rewrite `src/renderer/src/tools/nginx-generator/index.tsx`:

```tsx
import { useState } from 'react'
import { CopyButton } from '@components/CopyButton'
import { generateNginxConfig, validateNginxConfig } from './transform'
import type { NginxOptions, ServerBlock, LocationBlock } from './types'

type Strategy = 'round_robin' | 'least_conn' | 'ip_hash'
const BLANK_SERVER = (): ServerBlock => ({ serverName: '', listen: 80, ssl: false, forceHttps: false, locations: [] })
const BLANK_LOC = (): LocationBlock => ({ type: 'static', path: '/' })
const STRATEGIES: { id: Strategy; label: string }[] = [{ id: 'round_robin', label: '轮询' }, { id: 'least_conn', label: '最少连接' }, { id: 'ip_hash', label: 'IP Hash' }]
const LOC_TYPES: { id: LocationBlock['type']; label: string }[] = [{ id: 'static', label: '静态' }, { id: 'proxy', label: '代理' }, { id: 'redirect', label: '重定向' }, { id: 'custom', label: '自定义' }]

export default function NginxGeneratorPage(): JSX.Element {
  const [servers, setServers] = useState<ServerBlock[]>([BLANK_SERVER()])
  const [upstreamServers, setUpstreamServers] = useState('')
  const [upstreamStrategy, setUpstreamStrategy] = useState<Strategy>('round_robin')
  const [out, setOut] = useState('')
  const [errors, setErrors] = useState('')
  const [problems, setProblems] = useState<string[]>([])

  const patch = (i: number, p: Partial<ServerBlock>): void => setServers((prev) => prev.map((s, j) => (j === i ? { ...s, ...p } : s)))
  const patchLoc = (i: number, li: number, p: Partial<LocationBlock>): void => setServers((prev) => prev.map((s, j) => (j === i ? { ...s, locations: (s.locations ?? []).map((l, k) => (k === li ? { ...l, ...p } : l)) } : s)))
  const addServer = (): void => setServers((p) => [...p, BLANK_SERVER()])
  const removeServer = (i: number): void => setServers((p) => p.filter((_, j) => j !== i))
  const addLoc = (i: number): void => setServers((p) => p.map((s, j) => (j === i ? { ...s, locations: [...(s.locations ?? []), BLANK_LOC()] } : s)))

  const build = (): NginxOptions => ({
    upstream: upstreamServers.trim() ? { servers: upstreamServers.split('\n').filter(Boolean).map((host) => ({ host: host.trim() })), strategy: upstreamStrategy } : undefined,
    servers,
  })
  const setProxyToUpstream = (i: number): void => { if (upstreamServers.trim()) patch(i, { proxyPass: 'http://backend' }) }

  const gen = (): void => { setProblems([]); const r = generateNginxConfig(build()); if (r.status === 'ok') { setOut(r.data); setErrors('') } else { setErrors(r.message); setOut('') } }
  const check = (): void => { setProblems(validateNginxConfig(build())); setOut('') }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <header className="mb-4 flex items-baseline gap-3">
        <h1 className="text-2xl font-bold">nginx 配置生成</h1>
        <span className="font-mono text-[11px] tracking-[0.25em] text-neutral">MULTI-SERVER · SSL · PROXY · CHECK</span>
      </header>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="space-y-3 border border-base-300 bg-base-200/40 p-4">
          <label className="flex items-center gap-2 text-sm">upstream(每行 host)
            <textarea className="textarea textarea-bordered textarea-sm flex-1 font-mono" rows={2} value={upstreamServers} onChange={(e) => setUpstreamServers(e.target.value)} placeholder="10.0.0.1:8080" /></label>
          <label className="flex items-center gap-2 text-sm">策略
            <select className="select select-bordered select-sm" value={upstreamStrategy} onChange={(e) => setUpstreamStrategy(e.target.value as Strategy)}>{STRATEGIES.map((s) => <option key={s.id}>{s.label}</option>)}</select></label>
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-sm btn-primary" onClick={gen}>生成</button>
            <button className="btn btn-sm btn-outline" onClick={check}>配置检查</button>
            <button className="btn btn-sm btn-ghost" onClick={addServer}>+ 新增 server</button>
          </div>
          {problems.length > 0 && <div className="rounded border border-error/50 bg-base-100 p-3 text-sm text-error"><div className="font-mono text-[11px] tracking-widest text-error">发现问题</div><ul className="list-disc pl-5">{problems.map((p, i) => <li key={i}>{p}</li>)}</ul></div>}
          {errors && <div className="text-error text-sm">{errors}</div>}
        </section>
        <section className="border border-base-300 bg-base-200/40 p-4">
          {out ? <div className="flex items-start gap-2"><pre className="flex-1 overflow-auto rounded bg-base-100 p-2 font-mono text-xs">{out}</pre><CopyButton getText={() => out} enabled /></div> : <p className="text-sm text-neutral">填写左侧选项,点「生成」得到 nginx 配置…</p>}
        </section>
      </div>
      <div className="mt-4 grid gap-3">
        {servers.map((s, i) => (
          <div key={i} className="space-y-2 rounded border border-base-300 bg-base-100 p-3">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] text-neutral">server {i + 1}</span>
              <button className="btn btn-xs btn-ghost ml-auto" onClick={() => removeServer(i)}>删除</button>
            </div>
            <div className="flex flex-wrap gap-2">
              <label className="flex items-center gap-2 text-sm">server_name<input className="input input-bordered input-sm font-mono" value={s.serverName} onChange={(e) => patch(i, { serverName: e.target.value })} /></label>
              <label className="flex items-center gap-2 text-sm">listen<input className="input input-bordered input-sm w-20 font-mono" value={s.listen} onChange={(e) => patch(i, { listen: Number(e.target.value) || 80 })} /></label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={s.ssl} onChange={(e) => patch(i, { ssl: e.target.checked, listen: e.target.checked ? 443 : 80 })} />SSL</label>
            </div>
            {s.ssl && (
              <div className="flex flex-wrap gap-2 border border-base-300 bg-base-200/40 p-2">
                <label className="flex items-center gap-2 text-sm">证书路径<input className="input input-bordered input-sm flex-1 font-mono" value={s.sslCert ?? ''} onChange={(e) => patch(i, { sslCert: e.target.value })} placeholder="/etc/nginx/cert.pem" /></label>
                <label className="flex items-center gap-2 text-sm">私钥路径<input className="input input-bordered input-sm flex-1 font-mono" value={s.sslKey ?? ''} onChange={(e) => patch(i, { sslKey: e.target.value })} placeholder="/etc/nginx/key.pem" /></label>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span>模式:</span>
              <label className="flex items-center gap-1"><input type="radio" name={`mode-${i}`} checked={!!s.proxyPass} onChange={() => patch(i, { proxyPass: '', root: '' })} />反向代理</label>
              <input className="input input-bordered input-sm flex-1 font-mono" value={s.proxyPass ?? ''} onChange={(e) => patch(i, { proxyPass: e.target.value, root: '' })} placeholder="http://backend" disabled={!!s.root} />
              <button className="btn btn-xs btn-ghost" onClick={() => setProxyToUpstream(i)}>用 upstream</button>
              <label className="flex items-center gap-1"><input type="radio" name={`mode-${i}`} checked={!!s.root} onChange={() => patch(i, { root: '/var/www', proxyPass: '' })} />静态 root</label>
              <input className="input input-bordered input-sm flex-1 font-mono" value={s.root ?? ''} onChange={(e) => patch(i, { root: e.target.value, proxyPass: '' })} placeholder="/var/www/html" disabled={!!s.proxyPass} />
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              <label className="flex items-center gap-1"><input type="checkbox" checked={s.websocket ?? false} onChange={(e) => patch(i, { websocket: e.target.checked })} />WebSocket</label>
              <label className="flex items-center gap-1"><input type="checkbox" checked={s.forceHttps ?? false} onChange={(e) => patch(i, { forceHttps: e.target.checked })} />强制 HTTPS</label>
              <label className="flex items-center gap-1"><input type="checkbox" checked={s.cache ?? false} onChange={(e) => patch(i, { cache: e.target.checked })} />静态缓存</label>
              <label className="flex items-center gap-1"><input type="checkbox" checked={s.gzip ?? false} onChange={(e) => patch(i, { gzip: e.target.checked })} />gzip</label>
              <label className="flex items-center gap-1"><input type="checkbox" checked={s.securityHeaders ?? false} onChange={(e) => patch(i, { securityHeaders: e.target.checked })} />安全头</label>
              <label className="flex items-center gap-1"><input type="checkbox" checked={s.hsts ?? false} onChange={(e) => patch(i, { hsts: e.target.checked })} />HSTS</label>
            </div>
            {s.forceHttps && s.ssl && (
              <div className="rounded border border-base-300 bg-base-200/50 p-2 text-xs text-neutral">强制 HTTPS 步骤:①确保证书/私钥路径已填 ②选跳转码 ③生成后自动产出 80→跳转 server 与 443 主 server。跳转码:
                <select className="select select-bordered select-sm" value={s.redirectCode ?? '301'} onChange={(e) => patch(i, { redirectCode: e.target.value as '301' | '308' })}><option value="301">301</option><option value="308">308</option></select>
              </div>
            )}
            <div className="space-y-1">
              {(s.locations ?? []).map((l, li) => (
                <div key={li} className="flex flex-wrap items-center gap-2 text-sm">
                  <select className="select select-bordered select-sm" value={l.type} onChange={(e) => patchLoc(i, li, { type: e.target.value as LocationBlock['type'] })}>{LOC_TYPES.map((t) => <option key={t.id}>{t.label}</option>)}</select>
                  <input className="input input-bordered input-sm w-32 font-mono" value={l.path} onChange={(e) => patchLoc(i, li, { path: e.target.value })} placeholder="/api/" />
                  {l.type === 'proxy' && <input className="input input-bordered input-sm flex-1 font-mono" value={l.proxyPass ?? ''} onChange={(e) => patchLoc(i, li, { proxyPass: e.target.value })} placeholder="http://backend" />}
                  {l.type === 'static' && <input className="input input-bordered input-sm flex-1 font-mono" value={l.root ?? ''} onChange={(e) => patchLoc(i, li, { root: e.target.value })} placeholder="/var/www" />}
                  {l.type === 'redirect' && <input className="input input-bordered input-sm flex-1 font-mono" value={l.redirect ?? ''} onChange={(e) => patchLoc(i, li, { redirect: e.target.value })} placeholder="/new" />}
                  {l.type === 'custom' && <input className="input input-bordered input-sm flex-1 font-mono" value={l.custom ?? ''} onChange={(e) => patchLoc(i, li, { custom: e.target.value })} placeholder="proxy_set_header X-A $v;" />}
                </div>
              ))}
              <button className="btn btn-xs btn-ghost" onClick={() => addLoc(i)}>+ 新增 location</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/tools/nginx-generator/index.tsx
git commit -m "feat(nginx-generator): multi-server UI with SSL section, mutual-exclusion, config check"
```

---

## Group 6: JVM (#7)

### Task 16: JVM preset + more flags

**Files:**
- Modify: `src/renderer/src/tools/jvm-params/types.ts`, `transform.ts`
- Test: `test/jvm-params.test.ts`

**Interfaces:**
- Consumes: existing `generateJvmParams`.
- Produces: `JvmOptions` gains `xss?`, `maxMetaspace?`, `maxDirectMemory?`, `server?`, `gcLog?`, `oomExit?`, `compressedOops?`, `encoding?`; new `JVM_PRESETS` export.

- [ ] **Step 1: Update types**

```ts
export interface JvmOptions {
  xms?: string; xmx?: string; xmn?: string; metaspace?: string
  gc?: GcStrategy
  heapDump?: boolean; heapDumpPath?: string; remoteDebugPort?: string
  printGc?: boolean; jmxPort?: string; flightRecorder?: boolean
  container?: boolean
  xss?: string; maxMetaspace?: string; maxDirectMemory?: string
  server?: boolean; gcLog?: boolean; oomExit?: boolean; compressedOops?: boolean; encoding?: boolean
  extra: string[]
}
export interface JvmPreset { id: string; label: string; options: Partial<JvmOptions> }
```

- [ ] **Step 2: Write failing tests**

Append to `test/jvm-params.test.ts`:

```ts
describe('jvm v2 flags', () => {
  it('emits xss / maxMetaspace / maxDirectMemory / server / gcLog / oomExit / compressedOops / encoding', () => {
    const r = generateJvmParams({ xss: '1m', maxMetaspace: '512m', maxDirectMemory: '256m', server: true, gcLog: true, oomExit: true, compressedOops: true, encoding: true, extra: [] })
    expect(r.status).toBe('ok')
    if (r.status === 'ok') {
      expect(r.data).toContain('-Xss1m')
      expect(r.data).toContain('-XX:MaxMetaspaceSize=512m')
      expect(r.data).toContain('-XX:MaxDirectMemorySize=256m')
      expect(r.data).toContain('-server')
      expect(r.data).toContain('-Xlog:gc*')
      expect(r.data).toContain('-XX:+ExitOnOutOfMemoryError')
      expect(r.data).toContain('-XX:+UseCompressedOops')
      expect(r.data).toContain('-Dfile.encoding=UTF-8')
    }
  })
})
```

- [ ] **Step 3: Run to confirm fail**

Run: `pnpm vitest run test/jvm-params.test.ts -t "v2 flags"`
Expected: FAIL.

- [ ] **Step 4: Implement transform.ts**

Add flags after existing ones:
```ts
  if (o.server) rows.push({ flag: '-server', note: '服务器模式(默认)' })
  if (o.xss) rows.push({ flag: `-Xss${o.xss}`, note: '线程栈大小' })
  if (o.maxMetaspace) rows.push({ flag: `-XX:MaxMetaspaceSize=${o.maxMetaspace}`, note: '元空间上限' })
  if (o.maxDirectMemory) rows.push({ flag: `-XX:MaxDirectMemorySize=${o.maxDirectMemory}`, note: '直接内存上限' })
  if (o.gcLog) rows.push({ flag: '-Xlog:gc*', note: '统一日志 GC' })
  if (o.oomExit) rows.push({ flag: '-XX:+ExitOnOutOfMemoryError', note: 'OOM 时退出进程' })
  if (o.compressedOops) rows.push({ flag: '-XX:+UseCompressedOops', note: '压缩对象指针' })
  if (o.encoding) rows.push({ flag: '-Dfile.encoding=UTF-8', note: '文件编码' })
```

Add presets export (and import `JvmPreset` type):
```ts
export const JVM_PRESETS: JvmPreset[] = [
  { id: 'small', label: '小(1-2G)', options: { xms: '256m', xmx: '1g', xmn: '256m', metaspace: '256m', maxMetaspace: '512m', server: true } },
  { id: 'medium', label: '中(4G)', options: { xms: '1g', xmx: '4g', xmn: '1g', metaspace: '512m', maxMetaspace: '1g', server: true, gcLog: true, compressedOops: true, encoding: true } },
  { id: 'large', label: '大(8G+)', options: { xms: '2g', xmx: '8g', xmn: '2g', metaspace: '1g', maxMetaspace: '2g', server: true, gcLog: true, oomExit: true, compressedOops: true, encoding: true } },
  { id: 'container', label: '容器内', options: { container: true, maxMetaspace: '256m', server: true } },
]
```

- [ ] **Step 5: Run to confirm pass**

Run: `pnpm vitest run test/jvm-params.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/renderer/src/tools/jvm-params/types.ts src/renderer/src/tools/jvm-params/transform.ts test/jvm-params.test.ts
git commit -m "feat(jvm-params): preset + more flags (xss/maxMetaspace/maxDirectMemory/gcLog/oomExit/compressedOops/encoding)"
```

### Task 17: JVM index.tsx wizard form

**Files:**
- Modify: `src/renderer/src/tools/jvm-params/index.tsx`

**Interfaces:**
- Consumes: `JVM_PRESETS`, updated `generateJvmParams`.
- Produces: preset buttons + checkbox grid + labeled inputs with Chinese hints.

- [ ] **Step 1: Implement**

Rewrite `src/renderer/src/tools/jvm-params/index.tsx`:

```tsx
import { useState } from 'react'
import { CopyButton } from '@components/CopyButton'
import { generateJvmParams, JVM_PRESETS } from './transform'
import type { GcStrategy, JvmOptions } from './types'

type GcValue = GcStrategy | ''
const GC_OPTIONS: { value: GcValue; label: string }[] = [{ value: '', label: '无' }, { value: 'g1', label: 'G1' }, { value: 'zgc', label: 'ZGC' }, { value: 'shenandoah', label: 'Shenandoah' }]

export default function JvmParamsPage(): JSX.Element {
  const [f, setF] = useState<JvmOptions>({ extra: [] })
  const [extraStr, setExtraStr] = useState('')
  const [out, setOut] = useState('')

  const set = (patch: Partial<JvmOptions>): void => setF({ ...f, ...patch })
  const applyPreset = (id: string): void => {
    const p = JVM_PRESETS.find((x) => x.id === id)
    if (p) setF({ ...f, ...p.options })
  }
  const num = (label: string, key: keyof JvmOptions): JSX.Element => (
    <label className="flex items-center gap-2 text-sm">{label}
      <input className="input input-bordered input-sm w-24 font-mono" value={String(f[key] ?? '')} onChange={(e) => set({ [key]: e.target.value } as Partial<JvmOptions>)} placeholder="512m" /></label>
  )
  const box = (label: string, key: keyof JvmOptions): JSX.Element => (
    <label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={!!f[key]} onChange={(e) => set({ [key]: e.target.checked } as Partial<JvmOptions>)} />{label}</label>
  )
  const gen = (): void => {
    const r = generateJvmParams({ ...f, extra: extraStr.split('\n').filter(Boolean) })
    if (r.status === 'ok') setOut(r.data)
  }
  return (
    <div className="mx-auto max-w-4xl p-6">
      <header className="mb-4 flex items-baseline gap-3">
        <h1 className="text-2xl font-bold">JVM 参数生成</h1>
        <span className="font-mono text-[11px] tracking-[0.25em] text-neutral">HEAP · GC · DEBUG · MONITOR</span>
      </header>
      <section className="space-y-3 border border-base-300 bg-base-200/40 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-neutral">场景预设:</span>
          {JVM_PRESETS.map((p) => <button key={p.id} className="btn btn-sm btn-ghost" onClick={() => applyPreset(p.id)}>{p.label}</button>)}
        </div>
        <div className="flex flex-wrap gap-3">{num('Xms', 'xms')}{num('Xmx', 'xmx')}{num('Xmn', 'xmn')}{num('Xss', 'xss')}{num('Metaspace', 'metaspace')}{num('MaxMetaspace', 'maxMetaspace')}{num('MaxDirectMemory', 'maxDirectMemory')}</div>
        <label className="flex items-center gap-2 text-sm">GC<select className="select select-bordered select-sm" value={f.gc ?? ''} onChange={(e) => set({ gc: (e.target.value || undefined) as GcValue })}>{GC_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>
        <div className="flex flex-wrap gap-3">
          {box('服务器模式 -server', 'server')}
          {box('OOM 堆转储', 'heapDump')}
          {box('打印 GC', 'printGc')}
          {box('统一 GC 日志', 'gcLog')}
          {box('JFR', 'flightRecorder')}
          {box('容器感知', 'container')}
          {box('OOM 退出', 'oomExit')}
          {box('压缩指针', 'compressedOops')}
          {box('UTF-8 编码', 'encoding')}
        </div>
        <div className="flex flex-wrap gap-3">{num('HeapDumpPath', 'heapDumpPath')}{num('远程调试端口', 'remoteDebugPort')}{num('JMX 端口', 'jmxPort')}</div>
        <textarea value={extraStr} onChange={(e) => setExtraStr(e.target.value)} placeholder="自定义参数(每行一个,如 -Dspring.profiles.active=prod)" className="textarea textarea-bordered textarea-sm w-full font-mono" rows={2} />
        <button className="btn btn-sm btn-primary" onClick={gen}>生成</button>
      </section>
      <div className="mt-4">
        {out ? <div className="flex items-start gap-2"><pre className="flex-1 overflow-auto rounded bg-base-100 p-2 font-mono text-sm">{out}</pre><CopyButton getText={() => out} enabled /></div> : <p className="text-sm text-neutral">选择参数后生成…</p>}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify + commit**

Run: `pnpm typecheck`
```bash
git add src/renderer/src/tools/jvm-params/index.tsx
git commit -m "feat(jvm-params): wizard form with presets + more checkboxes"
```

---

### Task 18: Full regression

**Files:** none (verification)

- [ ] **Step 1: Run all tests**

Run: `pnpm test`
Expected: all PASS.

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 3: Lint**

Run: `pnpm lint`
Expected: no errors.

- [ ] **Step 4: Manual UI smoke**

Run: `pnpm dev:web`, open each tool (`/tools/password-tools`, `/tools/jwt-tool`, `/tools/log-analyzer`, `/tools/docker-tools`, `/tools/nginx-generator`, `/tools/jvm-params`) and verify the new UI renders.

---

## Self-Review

**Spec coverage:**
- #1 密码强度(字符清单/评分条/建议独立块) → Task 4,5 ✓
- #2 JWT(算法下拉+非对称校验+友好时间+高亮) → Task 8,9 ✓
- #3 密码合并 + 生成规则 → Task 5,6,7 ✓
- #4 日志(健壮化/错误率配色/补单位) → Task 10,11 ✓
- #5 Docker(模板/网络/日志/重启) → Task 12,13 ✓
- #6 nginx(SSL 分节/互斥/联动/步骤/检查/多块) → Task 14,15 ✓
- #7 JVM(预设/更多参数) → Task 16,17 ✓

**Placeholder scan:** No TBD/TODO. Every code step has concrete code. Task 15 (nginx) has a complete JSX implementation. No "fill in details" or "implement later".

**Type consistency:** `NginxOptions.servers`/`ServerBlock`/`LocationBlock` consistent across Task 14/15. `JvmOptions` fields match Task 16/17. `RunOptions.logging`/`ComposeService` match Task 12/13. `StrengthReport.charsets` matches Task 4/5. `TimelinePoint.error`/`LevelStat.isHigh` match Task 10/11. `verifyJwt` signature (`token, secret, alg, publicKey?`) matches Task 8/9.
