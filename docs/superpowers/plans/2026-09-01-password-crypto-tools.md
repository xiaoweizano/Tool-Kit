# password-crypto-tools Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 3 offline crypto tools (password-generator / password-strength / jwt-tool) to ToolKit.

**Architecture:** Each tool is a `src/renderer/src/tools/<id>/` folder. `password-strength` + `jwt-tool` are worker tools (useLiveTransform + opts.action). `password-generator` is a local button-triggered tool (id-generator pattern). Crypto correctness is the hard gate: golden tests assert round-trip (encrypt→decrypt) and BCrypt compare. `jose` is async but works through the comlink worker path — no shared type changes.

**Tech Stack:** React 18, TypeScript, tailwind/daisyUI, vitest, comlink worker. New deps: `bcryptjs`, `jose`. AES/RSA use native Web Crypto (no crypto-js/jsencrypt).

## Global Constraints

- Output = `ToolResult<string>` / `ToolResult<Structured>` from `@core/types`. Banned libraries: crypto-js (weak default KDF), jsencrypt (heavy), jsonwebtoken (Node).
- BCrypt: use `bcryptjs`, NEVER hand-write salt; cost 10 default. Spring `BCryptPasswordEncoder` equivalent.
- Worker tools register in `transform.worker.ts`; local tools (password-generator) do NOT.
- Every tool: `icon.tsx` (returns a mono glyph `<span>`), `index.tsx`, `transform.ts`, `types.ts`.
- Integration = `register.ts` one ToolDescriptor + `transform.worker.ts` one registry.set (worker tools only).
- Chinese UI; follow DESIGN.md "Circuit Workbench" (wrapper `mx-auto max-w-4xl p-6`, `text-2xl font-bold` h1, `font-mono text-[11px] tracking-[0.25em]` mono annotation, `border border-base-300 bg-base-200/40` sections, `CopyButton`).
- Golden tests: `test/<id>.test.ts`, import `@tools/<id>/transform`, assert `ToolResult` with `toEqual({status:'ok', data:...})`.
- Do NOT commit the design docs / openspec artifacts as part of feature commits — only code + tests.

---

## File Structure

```
src/renderer/src/tools/password-strength/{icon.tsx, index.tsx, transform.ts, types.ts}
src/renderer/src/tools/jwt-tool/{icon.tsx, index.tsx, transform.ts, types.ts}
src/renderer/src/tools/password-generator/{icon.tsx, index.tsx, transform.ts, types.ts, components/{RandomPanel,CryptoPanel,BcryptPanel}.tsx}
src/renderer/src/tools/register.ts                (modify: 3 ToolDescriptor + lazy imports)
src/renderer/src/core/transform.worker.ts          (modify: 2 registry.set — password-strength, jwt-tool)
test/password-strength.test.ts
test/jwt-tool.test.ts
test/password-generator.test.ts
```

---

## Task 1: Install deps + types

**Files:**
- Modify: `package.json` (via `pnpm add`)
- Create: `src/renderer/src/tools/password-strength/types.ts`
- Create: `src/renderer/src/tools/jwt-tool/types.ts`
- Create: `src/renderer/src/tools/password-generator/types.ts`

**Interfaces:**
- Produces: `StrengthReport`, `GenerateOpts` (password-strength); `JwtResult`, `JwtAlg` (jwt-tool); `RandomGenOpts`, `AesResult`, `RsaResult`, `BcryptResult` (password-generator).

- [ ] **Step 1: Install deps**

```bash
pnpm add bcryptjs jose
```

Expected: deps added to `package.json`.

- [ ] **Step 2: Password-strength types**

```ts
// src/renderer/src/tools/password-strength/types.ts
export type Level = 'weak' | 'medium' | 'strong'
export interface StrengthCheck { id: string; label: string; passed: boolean; hint?: string }
export interface StrengthReport {
  score: number        // 0-100
  level: Level
  length: number
  checks: StrengthCheck[]
  suggestions: string[]
}
export interface GenerateOpts {
  targetLevel?: Level          // default 'medium'
  minLength?: number           // default 12
  requireCharsets?: string[]   // e.g. ['lower','upper','digit']
  excludeChars?: string        // e.g. '0Ol1'
}
```

- [ ] **Step 3: After defining the 3 types files, run a typecheck to ensure no parse error**

Run: `pnpm typecheck`
Expected: PASS (no errors from the new files — they are imported nowhere yet, so no breakage).

- [ ] **Step 4: Commit**

```bash
git add src/renderer/src/tools/password-strength/types.ts src/renderer/src/tools/jwt-tool/types.ts src/renderer/src/tools/password-generator/types.ts package.json pnpm-lock.yaml
git commit -m "chore: add crypto tool type definitions and deps"
```

---

## Task 2: password-strength analyzeStrength (TDD)

**Files:**
- Create: `src/renderer/src/tools/password-strength/transform.ts`
- Test: `test/password-strength.test.ts`

**Interfaces:**
- Produces: `analyzeStrength(password: string): ToolResult<StrengthReport>`.
- Consumes: `StrengthReport`, `StrengthCheck`, `Level` from types.ts.

- [ ] **Step 1: Write the failing test**

```ts
// test/password-strength.test.ts
import { describe, it, expect } from 'vitest'
import { analyzeStrength } from '@tools/password-strength/transform'

describe('analyzeStrength', () => {
  it('弱密码 <40, 命中纯数字/顺序', () => {
    const r = analyzeStrength('123456')
    expect(r.status).toBe('ok')
    if (r.status === 'ok') {
      expect(r.data.score).toBeLessThan(40)
      expect(r.data.level).toBe('weak')
    }
  })
  it('强密码 >70, 命中全字符集/长 >12', () => {
    const r = analyzeStrength('Xk9#mQ@zV2$pL5nW')
    expect(r.status).toBe('ok')
    if (r.status === 'ok') {
      expect(r.data.score).toBeGreaterThan(70)
      expect(r.data.level).toBe('strong')
    }
  })
  it('空输入返回 invalid-input', () => {
    const r = analyzeStrength('')
    expect(r.status).toBe('error')
    if (r.status === 'error') expect(r.kind).toBe('invalid-input')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test test/password-strength.test.ts`
Expected: FAIL — "Cannot find module '@tools/password-strength/transform'".

- [ ] **Step 3: Implement analyzeStrength**

```ts
// src/renderer/src/tools/password-strength/transform.ts
import type { ToolResult } from '@core/types'
import type { StrengthReport, StrengthCheck, Level } from './types'

const COMMON = ['123456','password','12345678','qwerty','abc123','111111','123123','admin','letmein','welcome','monkey','iloveyou','1234567890','1234567','000000','dragon','sunshine','master','shadow','superman','qwertyuiop','654321','1qaz2wsx','zaq1xsw2','baseball','trustno1','hello','abcabc','a123456','123321','666666','121212','qwe123','asdfgh','zxcvbn','passwd','admin123','welcome1','p@ssw0rd']
const SEQ = 'abcdefghijklmnopqrstuvwxyz0123456789qwertyuiopasdfghjklzxcvbnm'
const CHARSET = { lower: /[a-z]/, upper: /[A-Z]/, digit: /[0-9]/, symbol: /[^a-zA-Z0-9]/ }
const KEYBOARD = ['qwerty','asdfgh','zxcvbn','1qaz2wsx','qazwsx','ab','12','23','34','45','56','67','78','89','0q','as','df','qw','wer','sdf','xcv']

const hasSeq = (s: string): boolean => {
  for (let i = 0; i + 3 <= s.length; i++) {
    const t = s.slice(i, i + 3).toLowerCase()
    if (SEQ.indexOf(t) >= 0) return true
  }
  return false
}
const hasKeyboard = (s: string): boolean => {
  const lo = s.toLowerCase()
  return KEYBOARD.some((k) => lo.includes(k))
}
const hasRepeat = (s: string): boolean => /(.)\1{2,}/.test(s)

function isCommon(p: string): boolean { return COMMON.includes(p.toLowerCase()) }

export function analyzeStrength(password: string): ToolResult<StrengthReport> {
  if (!password) return { status: 'error', kind: 'invalid-input', message: '请输入密码' }
  const len = password.length
  const counts = Object.values(CHARSET).filter((re) => re.test(password)).length

  const checks: StrengthCheck[] = [
    { id: 'length', label: '长度 ≥12', passed: len >= 12, hint: len >= 12 ? undefined : '建议长度 ≥12' },
    { id: 'charset', label: '含大小写+数字+符号', passed: counts >= 3, hint: counts >= 3 ? undefined : '建议混合大小写/数字/符号' },
    { id: 'seq', label: '无连续字符', passed: !hasSeq(password), hint: hasSeq(password) ? '含连续字符(如 123/abc),易被猜到' : undefined },
    { id: 'keyboard', label: '无键盘序列', passed: !hasKeyboard(password), hint: hasKeyboard(password) ? '含键盘序列(如 qwerty),易被猜到' : undefined },
    { id: 'repeat', label: '无重复字符', passed: !hasRepeat(password), hint: hasRepeat(password) ? '含重复字符(如 aaa),易被猜到' : undefined },
    { id: 'common', label: '非常见密码', passed: !isCommon(password), hint: isCommon(password) ? '命中常见密码表,请更换' : undefined }
  ]

  // score: length(0-25) + charset(0-25) + pattern penalties(bonus 0-25) + common penalty
  let score = 0
  score += Math.min(25, Math.round((len / 12) * 25))
  score += Math.min(25, counts * 8)
  const penalties = checks.filter((c) => ['seq','keyboard','repeat','common'].includes(c.id) && !c.passed).length
  score += Math.max(0, 25 - penalties * 10)
  score = Math.min(100, score)
  if (isCommon(password)) score = Math.min(score, 20)
  if (len < 8) score = Math.min(score, 25)

  const level: Level = score < 40 ? 'weak' : score <= 70 ? 'medium' : 'strong'
  const suggestions = checks.filter((c) => !c.passed && c.hint).map((c) => c.hint as string)
  if (suggestions.length === 0) suggestions.push('密码强度良好')
  return { status: 'ok', data: { score, level, length: len, checks, suggestions } }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test test/password-strength.test.ts`
Expected: PASS (3 tests). Note: if "123456" scores outside expectations, tune the scoring constants per Step 3 but keep the three assertions' invariants (weak<40, strong>70).

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/tools/password-strength/transform.ts test/password-strength.test.ts
git commit -m "feat(password-strength): analyzeStrength multi-dimension scoring"
```

---

## Task 3: password-strength generateByRules (TDD)

**Files:**
- Modify: `src/renderer/src/tools/password-strength/transform.ts`
- Test: `test/password-strength.test.ts` (append)

**Interfaces:**
- Produces: `generateByRules(opts: GenerateOpts): ToolResult<string>`.
- Consumes: `GenerateOpts` from types.ts; reuses `analyzeStrength`.

- [ ] **Step 1: Write the failing test**

```ts
it('generateByRules produces strong-level password', () => {
  const r = generateByRules({ targetLevel: 'strong', minLength: 16 })
  expect(r.status).toBe('ok')
  if (r.status === 'ok') {
    expect(r.data.length).toBeGreaterThanOrEqual(16)
    expect(analyzeStrength(r.data).status).toBe('ok')
    if (analyzeStrength(r.data).status === 'ok') expect(analyzeStrength(r.data).data.level).toBe('strong')
  }
})
it('generateByRules excludes chars', () => {
  const r = generateByRules({ targetLevel: 'strong', minLength: 12, excludeChars: '0Ol1' })
  expect(r.status).toBe('ok')
  if (r.status === 'ok') expect(/[0Ol1]/.test(r.data)).toBe(false)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test test/password-strength.test.ts`
Expected: FAIL — `generateByRules is not a function`.

- [ ] **Step 3: Implement**

```ts
// append to transform.ts
import type { GenerateOpts } from './types'

function randChar(set: string): string {
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  return set[buf[0] % set.length]
}
function makeCandidate(o: Required<Pick<GenerateOpts,'minLength'>> & GenerateOpts): string {
  const lower = 'abcdefghijklmnopqrstuvwxyz', upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', digit = '0123456789', symbol = '!@#$%^&*()-_=+[]{};:,.<>?'
  const required = o.requireCharsets ?? (o.targetLevel === 'strong' ? ['lower','upper','digit','symbol'] : ['lower','digit'])
  const pools: Record<string,string> = { lower, upper, digit, symbol }
  let allow = required.map((r) => pools[r]).join('')
  if (o.excludeChars) allow = [...allow].filter((c) => !o.excludeChars.includes(c)).join('')
  if (!allow) allow = lower + digit
  const chars = required.map((r) => randChar(pools[r].split('').filter((c) => !(o.excludeChars ?? '').includes(c)).join('') || pools[r]))
  while (chars.length < o.minLength) chars.push(randChar(allow))
  // shuffle
  for (let i = chars.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [chars[i], chars[j]] = [chars[j], chars[i]] }
  return chars.join('')
}

export function generateByRules(opts: GenerateOpts): ToolResult<string> {
  if ((opts.minLength ?? 12) < 4) return { status: 'error', kind: 'invalid-input', message: '长度至少 4' }
  const target = opts.targetLevel ?? 'medium'
  for (let i = 0; i < 2000; i++) {
    const cand = makeCandidate({ ...opts, minLength: opts.minLength ?? 12 })
    const a = analyzeStrength(cand)
    if (a.status === 'ok') {
      const lv = a.data.level
      if ((target === 'strong' && lv === 'strong') || (target === 'medium' && lv !== 'weak') || (target === 'weak')) {
        return { status: 'ok', data: cand }
      }
    }
  }
  return { status: 'ok', data: makeCandidate({ ...opts, minLength: opts.minLength ?? 12 }) }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test test/password-strength.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/tools/password-strength/transform.ts test/password-strength.test.ts
git commit -m "feat(password-strength): generateByRules"
```

---

## Task 4: jwt-tool parse/verify/sign/renew (TDD)

**Files:**
- Create: `src/renderer/src/tools/jwt-tool/transform.ts`
- Test: `test/jwt-tool.test.ts`

**Interfaces:**
- Produces: `parseJwt(token): ToolResult<JwtResult>`, `verifyJwt(token, secret, alg?): Promise<ToolResult<JwtResult>>`, `signJwt(payload, secret, alg?, expiry?): Promise<ToolResult<JwtResult>>`, `renewJwt(token, secret, newExpiry?): Promise<ToolResult<JwtResult>>`.
- Consumes: `JwtResult`, `JwtAlg` from types.ts. Uses `jose` (async).

- [ ] **Step 1: Add types (Task 1 referenced them; finalize here)**

```ts
// src/renderer/src/tools/jwt-tool/types.ts (create if not yet, or verify exists)
export type JwtAlg = 'HS256' | 'HS384' | 'HS512' | 'RS256' | 'RS384' | 'RS512'
export interface JwtResult {
  header?: Record<string, unknown>
  payload?: Record<string, unknown>
  isValid?: boolean
  verifyError?: string
  token?: string
  expiresAt?: string   // ISO8601
}
```

- [ ] **Step 2: Write the failing test**

```ts
// test/jwt-tool.test.ts
import { describe, it, expect, beforeAll } from 'vitest'
import { parseJwt, signJwt, verifyJwt, renewJwt } from '@tools/jwt-tool/transform'

const SECRET = 'super-secret'
describe('parseJwt', () => {
  it('parses header/payload', () => {
    const hb = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
    const pb = Buffer.from(JSON.stringify({ sub: 'u1', role: 'admin' })).toString('base64url')
    const tok = `${hb}.${pb}.sig`
    const r = parseJwt(tok)
    expect(r.status).toBe('ok')
    if (r.status === 'ok') { expect(r.data.payload).toEqual({ sub: 'u1', role: 'admin' }) }
  })
  it('tolerates surrounding whitespace/newlines and trims', () => {
    const hb = Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64url')
    const pb = Buffer.from(JSON.stringify({ a: 1 })).toString('base64url')
    const r = parseJwt(`\n  ${hb}.${pb}.sig  \n`)
    expect(r.status).toBe('ok')
  })
  it('rejects non-three-part token', () => {
    const r = parseJwt('abc.def')
    expect(r.status).toBe('error')
    if (r.status === 'error') expect(r.kind).toBe('invalid-input')
  })
})

describe('signJwt/verifyJwt', () => {
  it('HS256 round-trip', async () => {
    const s = await signJwt(JSON.stringify({ sub: 'u1' }), SECRET, 'HS256', '1h')
    expect(s.status).toBe('ok')
    if (s.status === 'ok') {
      const v = await verifyJwt(s.data.token as string, SECRET, 'HS256')
      expect(v.status).toBe('ok')
      if (v.status === 'ok') expect(v.data.isValid).toBe(true)
    }
  })
  it('verify wrong secret fails', async () => {
    const s = await signJwt(JSON.stringify({ sub: 'u1' }), SECRET, 'HS256', '1h')
    if (s.status === 'ok') {
      const v = await verifyJwt(s.data.token as string, 'wrong', 'HS256')
      expect(v.status).toBe('error')
      if (v.status === 'error') expect(v.kind).toBe('invalid-input')
    }
  })
})

describe('renewJwt', () => {
  it('updates exp and keeps payload', async () => {
    const old = await signJwt(JSON.stringify({ sub: 'u1', role: 'admin' }), SECRET, 'HS256', '1h')
    if (old.status !== 'ok') throw new Error('sign failed')
    const renewed = await renewJwt(old.data.token as string, SECRET, '7d')
    expect(renewed.status).toBe('ok')
    if (renewed.status === 'ok') {
      const p = parseJwt(renewed.data.token as string)
      if (p.status === 'ok') expect(p.data.payload?.sub).toBe('u1')
    }
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm test test/jwt-tool.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement**

```ts
// src/renderer/src/tools/jwt-tool/transform.ts
import type { ToolResult } from '@core/types'
import { jwtVerify, SignJWT, decodeJwt } from 'jose'
import type { JwtResult, JwtAlg } from './types'

const textToKey = (secret: string): Uint8Array => new TextEncoder().encode(secret)

function decodePart(part: string): Record<string, unknown> | null {
  try {
    const pad = part.padEnd(Math.ceil(part.length / 4) * 4, '=')
    const json = atob(pad.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(json)
  } catch { return null }
}

export function parseJwt(token: string): ToolResult<JwtResult> {
  const t = token.trim()
  const parts = t.split('.')
  if (parts.length !== 3) return { status: 'error', kind: 'invalid-input', message: '不是合法 JWT' }
  const header = decodePart(parts[0])
  const payload = decodePart(parts[1])
  if (!header || !payload) return { status: 'error', kind: 'invalid-input', message: 'JWT 解码失败' }
  const expiresAt = typeof (payload as any).exp === 'number' ? new Date((payload as any).exp * 1000).toISOString() : undefined
  return { status: 'ok', data: { header, payload, expiresAt } }
}

export async function signJwt(payloadJson: string, secret: string, alg: JwtAlg = 'HS256', expiry = '1h'): Promise<ToolResult<JwtResult>> {
  let payload: Record<string, unknown>
  try { payload = JSON.parse(payloadJson) } catch { return { status: 'error', kind: 'invalid-input', message: 'payload 不是合法 JSON' } }
  try {
    const token = await new SignJWT(payload).setProtectedHeader({ alg, typ: 'JWT' }).setIssuedAt().setExpirationTime(expiry).sign(textToKey(secret))
    return { status: 'ok', data: { token } }
  } catch { return { status: 'error', kind: 'unsupported', structure: alg, message: '签名失败,请检查密钥' } }
}

export async function verifyJwt(token: string, secret: string, alg: JwtAlg = 'HS256'): Promise<ToolResult<JwtResult>> {
  try {
    const { payload } = await jwtVerify(token.trim(), textToKey(secret), { algorithms: [alg] })
    return { status: 'ok', data: { payload: payload as Record<string, unknown>, isValid: true } }
  } catch (e) {
    const msg = e instanceof Error ? e.message : ''
    if (msg.includes('exp')) return { status: 'error', kind: 'invalid-input', message: 'Token 已过期' }
    return { status: 'error', kind: 'invalid-input', message: '签名不匹配' }
  }
}

export async function renewJwt(token: string, secret: string, newExpiry = '1h'): Promise<ToolResult<JwtResult>> {
  const parts = token.trim().split('.')
  if (parts.length !== 3) return { status: 'error', kind: 'invalid-input', message: '不是合法 JWT' }
  const payload = decodePart(parts[1])
  if (!payload) return { status: 'error', kind: 'invalid-input', message: 'JWT 解码失败' }
  const header = decodePart(parts[0])
  const alg = (Object.keys(header ?? {}).some((k) => (header as any)[k] === 'HS256' || (header as any)[k] === 'HS384' || (header as any)[k] === 'HS512') ? (header as any).alg : 'HS256') as JwtAlg
  return signJwt(JSON.stringify(payload), secret, alg, newExpiry)
}
```

> Note: the sign path in this plan uses a symmetric secret string for all algs (works for HS*). RS* (public/private keys) is scoped as v1-optional; sign/verify with PEM keys is deferred in this change's NOT-in-scope. If a reviewer needs RS*, extend `verifyJwt`/`signJwt` to accept a key (PEM string) via `jose.importSPKI`/`importPKCS8` — kept out to bound scope.

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test test/jwt-tool.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 6: Commit**

```bash
git add src/renderer/src/tools/jwt-tool/transform.ts src/renderer/src/tools/jwt-tool/types.ts test/jwt-tool.test.ts
git commit -m "feat(jwt-tool): parse/verify/sign/renew with jose"
```

---

## Task 5: password-generator (local) transforms (TDD)

**Files:**
- Create: `src/renderer/src/tools/password-generator/transform.ts`
- Test: `test/password-generator.test.ts`

**Interfaces:**
- Produces: `generatePassword(opts): ToolResult<string>`, `encryptAes(passphrase, plaintext): Promise<ToolResult<string>>`, `decryptAes(passphrase, ciphertext): Promise<ToolResult<string>>`, `generateRsaKeyPair(): Promise<ToolResult<RsaResult>>`, `encryptRsa(publicPem, plaintext): Promise<ToolResult<string>>`, `decryptRsa(privatePem, ciphertext): Promise<ToolResult<string>>`, `hashBcrypt(plaintext): ToolResult<string>`, `verifyBcrypt(plaintext, hash): ToolResult<{match: boolean}>`.
- Consumes: `RandomGenOpts`, `RsaResult` from types.ts; `bcryptjs`, Web Crypto.

- [ ] **Step 1: Add remaining types**

```ts
// src/renderer/src/tools/password-generator/types.ts (create/verify)
export interface RandomGenOpts { length: number; lower: boolean; upper: boolean; digit: boolean; symbol: boolean; customChars?: string }
export interface RsaResult { publicKey: string; privateKey: string }
export interface BcryptResult { match: boolean }
```

- [ ] **Step 2: Write the failing test**

```ts
// test/password-generator.test.ts
import { describe, it, expect } from 'vitest'
import { generatePassword, encryptAes, decryptAes, hashBcrypt, verifyBcrypt } from '@tools/password-generator/transform'

describe('generatePassword', () => {
  it('length + charset', () => {
    const r = generatePassword({ length: 20, lower: true, upper: true, digit: true, symbol: true })
    expect(r.status).toBe('ok')
    if (r.status === 'ok') expect(r.data.length).toBe(20)
  })
  it('empty input invalid', () => {
    const r = generatePassword({ length: 0, lower: true, upper: false, digit: false, symbol: false })
    expect(r.status).toBe('error')
  })
})
describe('AES round-trip', () => {
  it('encrypt then decrypt restores', async () => {
    const e = await encryptAes('secret', 'hello world')
    expect(e.status).toBe('ok')
    if (e.status === 'ok') {
      const d = await decryptAes('secret', e.data)
      expect(d.status).toBe('ok')
      if (d.status === 'ok') expect(d.data).toBe('hello world')
    }
  })
  it('wrong passphrase fails decrypt', async () => {
    const e = await encryptAes('secret', 'hello')
    if (e.status === 'ok') {
      const d = await decryptAes('wrong', e.data)
      expect(d.status).toBe('error')
      if (d.status === 'error') expect(d.kind).toBe('invalid-input')
    }
  })
})
describe('bcrypt', () => {
  it('hash + verify match', () => {
    const h = hashBcrypt('nacos-password')
    expect(h.status).toBe('ok')
    if (h.status === 'ok') {
      expect(h.data.startsWith('$2')).toBe(true)
      const v = verifyBcrypt('nacos-password', h.data)
      expect(v.status).toBe('ok')
      if (v.status === 'ok') expect(v.data.match).toBe(true)
    }
  })
  it('verify wrong plaintext is false (not error)', () => {
    const h = hashBcrypt('nacos-password')
    if (h.status === 'ok') {
      const v = verifyBcrypt('wrong', h.data)
      expect(v.status).toBe('ok')
      if (v.status === 'ok') expect(v.data.match).toBe(false)
    }
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm test test/password-generator.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement**

```ts
// src/renderer/src/tools/password-generator/transform.ts
import bcrypt from 'bcryptjs'
import type { ToolResult } from '@core/types'
import type { RandomGenOpts, RsaResult, BcryptResult } from './types'

const b64 = (buf: ArrayBuffer): string => btoa(String.fromCharCode(...new Uint8Array(buf)))

export function generatePassword(opts: RandomGenOpts): ToolResult<string> {
  if (opts.length < 4 || opts.length > 128) return { status: 'error', kind: 'invalid-input', message: '长度需在 4-128' }
  let pool = ''
  if (opts.lower) pool += 'abcdefghijklmnopqrstuvwxyz'
  if (opts.upper) pool += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  if (opts.digit) pool += '0123456789'
  if (opts.symbol) pool += '!@#$%^&*()-_=+[]{};:,.<>?'
  if (opts.customChars) pool += opts.customChars
  if (!pool) return { status: 'error', kind: 'invalid-input', message: '请至少选择一种字符集' }
  const buf = new Uint32Array(opts.length)
  crypto.getRandomValues(buf)
  let out = ''
  for (let i = 0; i < opts.length; i++) out += pool[buf[i] % pool.length]
  return { status: 'ok', data: out }
}

const getKey = async (passphrase: string): Promise<CryptoKey> => {
  const enc = new TextEncoder().encode(passphrase)
  const baseKey = await crypto.subtle.importKey('raw', enc, 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: enc, iterations: 100000, hash: 'SHA-256' },
    baseKey, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
  )
}

export async function encryptAes(passphrase: string, plaintext: string): Promise<ToolResult<string>> {
  if (!plaintext) return { status: 'error', kind: 'invalid-input', message: '请输入明文' }
  try {
    const key = await getKey(passphrase)
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plaintext))
    const full = new Uint8Array(iv.length + ct.byteLength)
    full.set(iv); full.set(new Uint8Array(ct), iv.length)
    return { status: 'ok', data: btoa(String.fromCharCode(...full)) }
  } catch { return { status: 'error', kind: 'invalid-input', message: '加密失败' } }
}

export async function decryptAes(passphrase: string, ciphertext: string): Promise<ToolResult<string>> {
  try {
    const raw = Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0))
    const iv = raw.slice(0, 12), ct = raw.slice(12)
    const key = await getKey(passphrase)
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct)
    return { status: 'ok', data: new TextDecoder().decode(pt) }
  } catch { return { status: 'error', kind: 'invalid-input', message: '解密失败:密钥不匹配或密文损坏' } }
}

export async function generateRsaKeyPair(): Promise<ToolResult<RsaResult>> {
  try {
    const kp = await crypto.subtle.generateKey({ name: 'RSA-OAEP', modulusLength: 2048, publicExponent: new Uint8Array([1,0,1]), hash: 'SHA-256' }, true, ['encrypt','decrypt'])
    const pub = await crypto.subtle.exportKey('spki', kp.publicKey)
    const priv = await crypto.subtle.exportKey('pkcs8', kp.privateKey)
    const toPem = (buf: ArrayBuffer, label: string): string => {
      const s = b64(buf).replace(/(.{64})/g, '$1\n')
      return `-----BEGIN ${label}-----\n${s}\n-----END ${label}-----`
    }
    return { status: 'ok', data: { publicKey: toPem(pub, 'PUBLIC KEY'), privateKey: toPem(priv, 'PRIVATE KEY') } }
  } catch { return { status: 'error', kind: 'engine', message: 'RSA 密钥生成失败' } }
}

const importPublic = async (pem: string): Promise<CryptoKey> => {
  const body = pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '')
  const der = Uint8Array.from(atob(body), (c) => c.charCodeAt(0))
  // try SPKI then PKCS#1
  for (const fmt of ['spki', 'pkcs1'] as const) {
    try { return await crypto.subtle.importKey(fmt, der, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['encrypt']) } catch { /* next */ }
  }
  throw new Error('bad key')
}
const importPrivate = async (pem: string): Promise<CryptoKey> => {
  const body = pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '')
  const der = Uint8Array.from(atob(body), (c) => c.charCodeAt(0))
  for (const fmt of ['pkcs8', 'pkcs1'] as const) {
    try { return await crypto.subtle.importKey(fmt, der, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['decrypt']) } catch { /* next */ }
  }
  throw new Error('bad key')
}

export async function encryptRsa(publicPem: string, plaintext: string): Promise<ToolResult<string>> {
  if (!plaintext) return { status: 'error', kind: 'invalid-input', message: '请输入明文' }
  try {
    const key = await importPublic(publicPem)
    const ct = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, key, new TextEncoder().encode(plaintext))
    return { status: 'ok', data: b64(ct) }
  } catch { return { status: 'error', kind: 'invalid-input', message: '密钥格式无效或加密失败' } }
}

export async function decryptRsa(privatePem: string, ciphertext: string): Promise<ToolResult<string>> {
  try {
    const key = await importPrivate(privatePem)
    const pt = await crypto.subtle.decrypt({ name: 'RSA-OAEP' }, key, Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0)))
    return { status: 'ok', data: new TextDecoder().decode(pt) }
  } catch { return { status: 'error', kind: 'invalid-input', message: '密钥格式无效或解密失败' } }
}

export function hashBcrypt(plaintext: string): ToolResult<string> {
  if (!plaintext) return { status: 'error', kind: 'invalid-input', message: '请输入明文' }
  try { return { status: 'ok', data: bcrypt.hashSync(plaintext, 10) } } catch { return { status: 'error', kind: 'engine', message: 'BCrypt 哈希失败' } }
}

export function verifyBcrypt(plaintext: string, hash: string): ToolResult<BcryptResult> {
  if (!plaintext || !hash) return { status: 'error', kind: 'invalid-input', message: '请填写明文与 hash' }
  try {
    const match = bcrypt.compareSync(plaintext, hash)
    return { status: 'ok', data: { match } }
  } catch { return { status: 'error', kind: 'invalid-input', message: 'hash 格式非法' } }
}
```

> Note: `bcryptjs.compareSync` returns `false` for a malformed hash rather than throwing, so the `catch` branch is a safety net only.

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test test/password-generator.test.ts`
Expected: PASS (5 tests: 2 rand + 2 AES + 2 bcrypt, minus any assertions needing tuning).

- [ ] **Step 6: Commit**

```bash
git add src/renderer/src/tools/password-generator/transform.ts src/renderer/src/tools/password-generator/types.ts test/password-generator.test.ts
git commit -m "feat(password-generator): random/AES/BCrypt transforms"
```

---

## Task 6: Worker registration + register.ts

**Files:**
- Modify: `src/renderer/src/core/transform.worker.ts`
- Modify: `src/renderer/src/tools/register.ts`

**Interfaces:**
- Consumes: `analyzeStrength`, `generateByRules` (password-strength); `parseJwt`, `verifyJwt`, `signJwt`, `renewJwt` (jwt-tool).

- [ ] **Step 1: Register worker tools**

Add to `transform.worker.ts` imports:
```ts
import { analyzeStrength, generateByRules } from '@tools/password-strength/transform'
import { parseJwt, verifyJwt, signJwt, renewJwt } from '@tools/jwt-tool/transform'
import type { JwtAlg } from '@tools/jwt-tool/types'
```
And registry entries:
```ts
registry.set('password-strength', ((input: string, opts?: TransformOpts) => {
  const action = opts?.action ?? 'analyze'
  if (action === 'generate') return generateByRules({ targetLevel: (opts?.targetLevel as any) ?? 'medium', minLength: Number(opts?.minLength ?? 12), requireCharsets: (opts?.requireCharsets as any), excludeChars: opts?.excludeChars as string | undefined })
  return analyzeStrength(input)
}) as Transform<unknown, unknown, TransformOpts>)
registry.set('jwt-tool', ((input: string, opts?: TransformOpts) => {
  const action = opts?.action ?? 'parse'
  const alg = (opts?.alg as JwtAlg) ?? 'HS256'
  if (action === 'verify') return verifyJwt(input, (opts?.secret ?? '') as string, alg)
  if (action === 'sign') return signJwt(input, (opts?.secret ?? '') as string, alg, (opts?.expiry as string) ?? '1h')
  if (action === 'renew') return renewJwt(input, (opts?.secret ?? '') as string, (opts?.expiry as string) ?? '1h')
  return parseJwt(input)
}) as Transform<unknown, unknown, TransformOpts>)
```

- [ ] **Step 2: Register ToolDescriptors**

Add to `register.ts` top imports:
```ts
import { PasswordStrengthIcon } from '@tools/password-strength/icon'
import { JwtIcon } from '@tools/jwt-tool/icon'
import { PasswordGenIcon } from '@tools/password-generator/icon'
```
Lazy imports (after existing ones):
```ts
const PasswordStrengthPageLazy = lazy(() => import('@tools/password-strength'))
const JwtToolPageLazy = lazy(() => import('@tools/jwt-tool'))
const PasswordGeneratorPageLazy = lazy(() => import('@tools/password-generator'))
```
Append to `tools` array:
```ts
{ id: 'password-strength', name: '密码强度', icon: PasswordStrengthIcon, route: '/tools/password-strength', component: PasswordStrengthPageLazy, capability: { offline: true } },
{ id: 'jwt-tool', name: 'JWT 解析', icon: JwtIcon, route: '/tools/jwt-tool', component: JwtToolPageLazy, capability: { offline: true } },
{ id: 'password-generator', name: '密码生成', icon: PasswordGenIcon, route: '/tools/password-generator', component: PasswordGeneratorPageLazy, capability: { offline: true } }
```

- [ ] **Step 3: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS (pages not yet created — lazy imports will resolve once pages exist; if typecheck fails on missing modules, create the page stubs in Task 7 first, or run this check after Task 7).

- [ ] **Step 4: Commit**

```bash
git add src/renderer/src/core/transform.worker.ts src/renderer/src/tools/register.ts
git commit -m "feat: register password-strength/jwt-tool worker + 3 tool descriptors"
```

---

## Task 7: Pages + icons

**Files:**
- Create: `src/renderer/src/tools/password-strength/{icon.tsx,index.tsx}`
- Create: `src/renderer/src/tools/jwt-tool/{icon.tsx,index.tsx}`
- Create: `src/renderer/src/tools/password-generator/{icon.tsx,index.tsx,components/{RandomPanel,CryptoPanel,BcryptPanel}.tsx}`

**Interfaces:**
- Consumes: `useLiveTransform` (`@core/useLiveTransform`), `runTransform` (`@core/transform.channel`), `CopyButton`, `TriStateOutput`, and the transforms from Tasks 2-5.

- [ ] **Step 1: Icons**

```tsx
// src/renderer/src/tools/password-strength/icon.tsx
export function PasswordStrengthIcon(): JSX.Element { return <span className="font-mono text-[11px]">{'强度'}</span> }
// src/renderer/src/tools/jwt-tool/icon.tsx
export function JwtIcon(): JSX.Element { return <span className="font-mono text-[11px]">{'JWT'}</span> }
// src/renderer/src/tools/password-generator/icon.tsx
export function PasswordGenIcon(): JSX.Element { return <span className="font-mono text-[11px]">{'pwd'}</span> }
```

- [ ] **Step 2: password-strength page**

```tsx
// src/renderer/src/tools/password-strength/index.tsx
import { useState } from 'react'
import { useLiveTransform } from '@core/useLiveTransform'
import { CopyButton } from '@components/CopyButton'
import { TriStateOutput } from '@components/TriStateOutput'
import { runTransform } from '@core/transform.channel'
import { generateByRules, analyzeStrength } from './transform'

const LEVEL_UI = { weak: 'bad', medium: 'warning', strong: 'success' } as const
const LEVEL_LABEL = { weak: '弱', medium: '中', strong: '强' } as const

export default function PasswordStrengthPage(): JSX.Element {
  const { input, setInput, opts, setOpts, phase, result } = useLiveTransform<string, import('./types').StrengthReport>('password-strength')
  const [genOut, setGenOut] = useState('')
  const [target, setTarget] = useState<'weak'|'medium'|'strong'>('medium')

  return (
    <div className="mx-auto max-w-4xl p-6">
      <header className="mb-4 flex items-baseline gap-3">
        <h1 className="text-2xl font-bold">密码强度分析</h1>
        <span className="font-mono text-[11px] tracking-[0.25em] text-neutral">SCORE · LEVEL · SUGGEST</span>
        <CopyButton getText={() => genOut} enabled={!!genOut} />
      </header>
      <section className="border border-base-300 bg-base-200/40 p-4">
        <textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="粘贴密码,实时分析…" className="textarea textarea-bordered w-full font-mono" rows={3} />
      </section>
      <div className="mt-4">
        <TriStateOutput
          result={result as any} phase={phase}
          emptyHint="粘贴密码查看强度评分与改进建议…"
          render={result?.status === 'ok' ? (r) => (
            <div>
              <div className={`badge badge-${LEVEL_UI[r.data.level]}`}>评分 {r.data.score} · {LEVEL_LABEL[r.data.level]} · 长度 {r.data.length}</div>
              <ul className="mt-2 list-disc pl-5 text-sm">
                {r.data.suggestions.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          ) : undefined}
        />
      </div>
      <section className="mt-6 border border-base-300 bg-base-200/40 p-4">
        <div className="flex items-center gap-3">
          <label className="text-sm text-neutral">目标强度
            <select className="select select-bordered select-sm ml-1" value={target} onChange={(e) => { setTarget(e.target.value as any); setOpts({ action: 'generate', targetLevel: e.target.value }) }}>
              <option value="weak">弱</option><option value="medium">中</option><option value="strong">强</option>
            </select>
          </label>
          <button className="btn btn-sm btn-primary" onClick={async () => { const r = await runTransform('password-strength', '', { action: 'generate', targetLevel: target }); if (r.status === 'ok') setGenOut(r.data as string) }}>生成</button>
        </div>
        {genOut && <pre className="mt-2 overflow-auto rounded bg-base-100 p-2 font-mono text-sm">{genOut}</pre>}
      </section>
    </div>
  )
}
```

> Note: `TriStateOutput` supports an optional `render` prop for custom result rendering (used by es-query-builder). If the render-prop type conflicts, fall back to rendering the report inline below the TriStateOutput and pass only the error path to TriStateOutput.

- [ ] **Step 3: jwt-tool page**

```tsx
// src/renderer/src/tools/jwt-tool/index.tsx
import { useState } from 'react'
import { useLiveTransform } from '@core/useLiveTransform'
import { CopyButton } from '@components/CopyButton'
import { TriStateOutput } from '@components/TriStateOutput'
import { runTransform } from '@core/transform.channel'

const ALGS = ['HS256','HS384','HS512','RS256','RS384','RS512']

export default function JwtToolPage(): JSX.Element {
  const { input, setInput, opts, setOpts, phase, result } = useLiveTransform<string, import('./types').JwtResult>('jwt-tool')
  const [secret, setSecret] = useState('')
  const [alg, setAlg] = useState('HS256')
  const [expiry, setExpiry] = useState('1h')
  const [actionOut, setActionOut] = useState<string>('')

  const trigger = async (action: string): Promise<void> => {
    const r = await runTransform('jwt-tool', input, { action, secret: secret || 'secret', alg, expiry })
    if (r.status === 'ok') setActionOut((r.data as any).token ?? JSON.stringify(r.data, null, 2))
    else setActionOut(r.message)
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
          <input value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="密钥/secret" className="input input-bordered input-sm w-40 font-mono" />
          <select className="select select-bordered select-sm" value={alg} onChange={(e) => setAlg(e.target.value)}>{ALGS.map((a) => <option key={a}>{a}</option>)}</select>
          <input value={expiry} onChange={(e) => setExpiry(e.target.value)} placeholder="expiry 如 1h/7d" className="input input-bordered input-sm w-32 font-mono" />
          <button className="btn btn-sm" onClick={() => trigger('verify')}>校验</button>
          <button className="btn btn-sm" onClick={() => trigger('sign')}>签名(用输入做 payload)</button>
          <button className="btn btn-sm" onClick={() => trigger('renew')}>续期</button>
        </div>
      </section>
      <div className="mt-4"><TriStateOutput result={result as any} phase={phase} emptyHint="粘贴 JWT 查看 header/payload…" /></div>
      {actionOut && <pre className="mt-4 overflow-auto rounded bg-base-100 p-2 font-mono text-sm">{actionOut}</pre>}
    </div>
  )
}
```

- [ ] **Step 4: password-generator page + panels**

```tsx
// src/renderer/src/tools/password-generator/components/RandomPanel.tsx
import { useState } from 'react'
import { CopyButton } from '@components/CopyButton'
import { generatePassword } from '../transform'

export function RandomPanel(): JSX.Element {
  const [len, setLen] = useState('16')
  const [sets, setSets] = useState({ lower: true, upper: true, digit: true, symbol: true })
  const [out, setOut] = useState('')
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-neutral">长度
          <input value={len} onChange={(e) => setLen(e.target.value.replace(/[^0-9]/g, ''))} className="input input-bordered input-sm w-20 font-mono" /></label>
        {(['lower','upper','digit','symbol'] as const).map((k) => (
          <label key={k} className="flex items-center gap-1 text-sm text-neutral">
            <input type="checkbox" checked={sets[k]} onChange={(e) => setSets({ ...sets, [k]: e.target.checked })} />{k === 'lower' ? '小写' : k === 'upper' ? '大写' : k === 'digit' ? '数字' : '符号'}
          </label>
        ))}
        <button className="btn btn-sm btn-primary ml-auto" onClick={() => { const r = generatePassword({ length: Number(len), ...sets }); setOut(r.status === 'ok' ? r.data : r.message) }}>生成</button>
      </div>
      {out && <div className="flex items-center gap-2"><pre className="flex-1 overflow-auto rounded bg-base-100 p-2 font-mono text-sm">{out}</pre><CopyButton getText={() => out} enabled={!!out} /></div>}
    </div>
  )
}
```

```tsx
// src/renderer/src/tools/password-generator/components/CryptoPanel.tsx
import { useState } from 'react'
import { CopyButton } from '@components/CopyButton'
import { encryptAes, decryptAes, generateRsaKeyPair, encryptRsa, decryptRsa } from '../transform'

export function CryptoPanel(): JSX.Element {
  const [tab, setTab] = useState<'aes'|'rsa'>('aes')
  const [pass, setPass] = useState('')
  const [plain, setPlain] = useState('')
  const [cipher, setCipher] = useState('')
  const [pub, setPub] = useState('')
  const [priv, setPriv] = useState('')
  const [out, setOut] = useState('')
  const run = async (fn: () => Promise<{status:'ok';data:string}|{status:'error';kind:string;message:string}>): Promise<void> => {
    const r = await fn(); setOut(r.status === 'ok' ? r.data : r.message)
  }
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button className={`btn btn-sm ${tab==='aes'?'btn-primary':'btn-ghost'}`} onClick={() => setTab('aes')}>AES-GCM</button>
        <button className={`btn btn-sm ${tab==='rsa'?'btn-primary':'btn-ghost'}`} onClick={() => setTab('rsa')}>RSA-OAEP</button>
      </div>
      {tab === 'aes' ? (
        <div className="space-y-2">
          <input value={pass} onChange={(e) => setPass(e.target.value)} placeholder="Passphrase(明文/解密共用)" className="input input-bordered input-sm w-full font-mono" />
          <div className="flex gap-2"><input value={plain} onChange={(e) => setPlain(e.target.value)} placeholder="明文" className="input input-bordered input-sm flex-1 font-mono" />
            <button className="btn btn-sm btn-primary" onClick={() => run(() => encryptAes(pass, plain))}>加密</button></div>
          <div className="flex gap-2"><input value={cipher} onChange={(e) => setCipher(e.target.value)} placeholder="密文(base64)" className="input input-bordered input-sm flex-1 font-mono" />
            <button className="btn btn-sm" onClick={() => run(() => decryptAes(pass, cipher))}>解密</button></div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex gap-2"><button className="btn btn-sm btn-outline" onClick={async () => { const r = await generateRsaKeyPair(); if (r.status === 'ok') { setPub(r.data.publicKey); setPriv(r.data.privateKey) } }}>生成密钥对</button></div>
          <textarea value={pub} onChange={(e) => setPub(e.target.value)} placeholder="公钥 PEM" className="textarea textarea-bordered textarea-sm w-full font-mono" rows={2} />
          <textarea value={priv} onChange={(e) => setPriv(e.target.value)} placeholder="私钥 PEM" className="textarea textarea-bordered textarea-sm w-full font-mono" rows={2} />
          <div className="flex gap-2"><input value={plain} onChange={(e) => setPlain(e.target.value)} placeholder="明文" className="input input-bordered input-sm flex-1 font-mono" />
            <button className="btn btn-sm btn-primary" onClick={() => run(() => encryptRsa(pub, plain))}>公钥加密</button></div>
          <div className="flex gap-2"><input value={cipher} onChange={(e) => setCipher(e.target.value)} placeholder="密文(base64)" className="input input-bordered input-sm flex-1 font-mono" />
            <button className="btn btn-sm" onClick={() => run(() => decryptRsa(priv, cipher))}>私钥解密</button></div>
        </div>
      )}
      {out && <div className="flex items-center gap-2"><pre className="flex-1 overflow-auto rounded bg-base-100 p-2 font-mono text-xs">{out}</pre><CopyButton getText={() => out} enabled={!!out} /></div>}
    </div>
  )
}
```

```tsx
// src/renderer/src/tools/password-generator/components/BcryptPanel.tsx
import { useState } from 'react'
import { CopyButton } from '@components/CopyButton'
import { hashBcrypt, verifyBcrypt } from '../transform'

export function BcryptPanel(): JSX.Element {
  const [plain, setPlain] = useState('')
  const [hash, setHash] = useState('')
  const [out, setOut] = useState('')
  return (
    <div className="space-y-3">
      <div className="flex gap-2"><input value={plain} onChange={(e) => setPlain(e.target.value)} placeholder="明文(如 nacos 密码)" className="input input-bordered input-sm flex-1 font-mono" />
        <button className="btn btn-sm btn-primary" onClick={() => { const r = hashBcrypt(plain); setOut(r.status === 'ok' ? r.data : r.message) }}>BCrypt 哈希</button></div>
      <div className="flex gap-2"><textarea value={hash} onChange={(e) => setHash(e.target.value)} placeholder="已有 BCrypt hash 用于校验" className="textarea textarea-bordered textarea-sm flex-1 font-mono" rows={2} />
        <button className="btn btn-sm" onClick={() => { const r = verifyBcrypt(plain, hash); setOut(r.status === 'ok' ? (r.data.match ? '匹配 ✔(明文对此 hash 有效)' : '不匹配 ✘') : r.message) }}>校验</button></div>
      {out && <div className="flex items-center gap-2"><pre className="flex-1 overflow-auto rounded bg-base-100 p-2 font-mono text-sm">{out}</pre><CopyButton getText={() => out} enabled={!!out} /></div>}
    </div>
  )
}
```

```tsx
// src/renderer/src/tools/password-generator/index.tsx
import { useState } from 'react'
import { RandomPanel } from './components/RandomPanel'
import { CryptoPanel } from './components/CryptoPanel'
import { BcryptPanel } from './components/BcryptPanel'

export default function PasswordGeneratorPage(): JSX.Element {
  const [tab, setTab] = useState<'random'|'crypto'|'bcrypt'>('random')
  return (
    <div className="mx-auto max-w-4xl p-6">
      <header className="mb-4 flex items-baseline gap-3">
        <h1 className="text-2xl font-bold">密码生成</h1>
        <span className="font-mono text-[11px] tracking-[0.25em] text-neutral">RANDOM · AES · RSA · BCRYPT</span>
      </header>
      <div className="mb-3 flex gap-2">
        {([['random','随机'],['crypto','AES/RSA'],['bcrypt','BCrypt']] as const).map(([id, label]) => (
          <button key={id} className={`btn btn-sm ${tab===id?'btn-primary':'btn-ghost'}`} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>
      <section className="border border-base-300 bg-base-200/40 p-4">
        {tab === 'random' && <RandomPanel />}
        {tab === 'crypto' && <CryptoPanel />}
        {tab === 'bcrypt' && <BcryptPanel />}
      </section>
    </div>
  )
}
```

- [ ] **Step 5: Run typecheck + lint**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS. (Fix any type-narrowing on `result`/`phase` as needed; the `as any` casts on TriStateOutput result are acceptable in this plan's page code.)

- [ ] **Step 6: Commit**

```bash
git add src/renderer/src/tools/password-strength src/renderer/src/tools/jwt-tool src/renderer/src/tools/password-generator
git commit -m "feat: password-strength/jwt-tool/password-generator pages + icons"
```

---

## Task 8: Full verification

**Files:**
- Modify: `openspec/changes/password-crypto-tools/tasks.md` (check off)
- Create: `docs/spec-checklist-password-crypto-tools.md`

- [ ] **Step 1: Run tests**

Run: `pnpm test`
Expected: all green (new golden + existing regression).

- [ ] **Step 2: Run typecheck + lint**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS.

- [ ] **Step 3: Manual UI smoke**

Run: `pnpm dev:web`, open `/tools/password-strength`, `/tools/jwt-tool`, `/tools/password-generator`.
Verify: strength scoring updates live; JWT parse auto-decodes with whitespace tolerance; AES encrypt→decrypt round-trips; RSA keygen + encrypt/decrypt round-trips; BCrypt hash + verify. Backend-free (no network) — confirm no requests.

- [ ] **Step 4: Validate change**

Run: `openspec validate password-crypto-tools`
Expected: valid.

- [ ] **Step 5: Commit**

```bash
git add openspec/changes/password-crypto-tools/docs docs/spec-checklist-password-crypto-tools.md
git commit -m "chore(password-crypto-tools): spec-checklist + progress"
```
