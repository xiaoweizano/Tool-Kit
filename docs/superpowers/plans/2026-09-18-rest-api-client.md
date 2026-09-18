# REST API 客户端 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 ToolKit 新增第 22 个工具「REST API 客户端」——本地优先的 API 调试工作台（cURL 双方言导入导出、多环境变量、树形集合、历史、响应面板、跨工具深链），并扩展底层 `net-fetch` IPC 通道支持取消/超时/错误分类。

**Architecture:** 三层：(1) 共享传输层 `core/net-channel.ts` + `core/http.ts`，桌面走 Electron `net.fetch`(IPC)、Web 走 `fetch`，失败统一抛带 `kind` 的 `NetFetchError`；(2) 工具纯函数层（`env-resolve`/`query-params`/`curl-parse`/`curl-build`/`store` reducer），全部 golden 测试锁定；(3) 三栏 UI（Sidebar/RequestPanel/ResponsePanel）。核心逻辑零依赖 UI、零依赖 electron。

**Tech Stack:** React 18 + TypeScript + Vite + Electron 33(Node 22) + Tailwind/daisyUI 5 + zustand 5 + Vitest(node env 纯函数 / jsdom UI) + Comlink(本工具不用 worker)。

## Global Constraints

- 中文界面；视觉沿用 `DESIGN.md` + daisyUI 主题，不新建设计系统。
- 本地优先：集合/环境/历史全部存本地(`core/storage`)，不上传、不加密(premise 2)。
- 一套代码双输出：renderer 不直接 import electron；Electron 能力只经 `window.toolkitAPI`。`scripts/check-web-purity.mjs` 必须通过(Web 产物无 electron 引用)。
- 错误三态 `ToolResult`(`ok`/`error{kind}`)，无静默失败；纯函数 transform + golden 测试。
- 向后兼容：`net-fetch` 扩展不得改变 translate 的编译与运行行为(translate 依赖 httpFetch 失败时 **reject**，经 `Promise.allSettled` 捕获)。
- 不注册 `transform.worker.ts`(本工具为交互型，非粘贴即转)。
- 测试：`pnpm test`(vitest run)、`pnpm typecheck`(tsc --noEmit)、`node scripts/check-web-purity.mjs`。纯函数测试用 `@tools`/`@core` alias；UI 测试文件首行 `// @vitest-environment jsdom`。
- 提交：Conventional Commits(`feat:`/`fix:`)，每个 Task 末尾一次提交。

## File Structure

| 文件 | 职责 | 动作 |
|---|---|---|
| `src/renderer/src/core/types.ts` | `ToolCapability.network` 联合加 `'rest-client'` | Modify |
| `src/renderer/src/core/net-channel.ts` | 传输层契约：类型、`NetFetchError`、`classifyFetchError`、`computeBodyBytes`、`normalizeHeaders` | Create |
| `src/renderer/src/core/http.ts` | `httpFetch(url,init,extra):Promise<NetFetchOk>`(失败抛 NetFetchError)+ `httpCancel(requestId)` | Modify |
| `electron/main.ts` | net-fetch:controller Map + `AbortSignal.any` + 结构化失败；新增 `net-cancel` | Modify |
| `electron/preload.ts` | 暴露 `netCancel`；`netFetch` payload 类型同步 | Modify |
| `src/renderer/src/core/storage.ts` | 新增 `storageSetChecked`(不改原有静默函数) | Modify |
| `src/renderer/src/core/useLiveTransform.ts` | 加可选 `initial` 入参(深链种子) | Modify |
| `src/renderer/src/tools/rest-api-client/types.ts` | `KV/RequestModel/Env/CollectionNode/HistoryEntry/ResponseModel` | Create |
| `src/renderer/src/tools/rest-api-client/env-resolve.ts` | `resolveVars`(原样替换) | Create |
| `src/renderer/src/tools/rest-api-client/query-params.ts` | `parseQuery`/`serializeQuery`(手写,不过 URL) | Create |
| `src/renderer/src/tools/rest-api-client/curl-parse.ts` | `parseCurl`(bash+cmd) | Create |
| `src/renderer/src/tools/rest-api-client/curl-build.ts` | `buildCurl`(bash) | Create |
| `src/renderer/src/tools/rest-api-client/store.ts` | zustand:集合树/环境/历史 + 写状态 + 导入导出 | Create |
| `src/renderer/src/tools/rest-api-client/http-client.ts` | 组装请求→httpFetch→错误映射/防重/取消 | Create |
| `src/renderer/src/tools/rest-api-client/deep-link.ts` | 深链写/读(sessionStorage 一次性) | Create |
| `src/renderer/src/tools/rest-api-client/icon.tsx` | 图标 | Create |
| `src/renderer/src/tools/rest-api-client/index.tsx` | 三栏容器 + 活动草稿 + 编辑模型 | Create |
| `src/renderer/src/tools/rest-api-client/components/{Sidebar,RequestPanel,ResponsePanel}.tsx` | 三栏各组件 | Create |
| `src/renderer/src/tools/register.ts` | 注册一行 | Modify |
| `src/renderer/src/tools/json-parser/index.tsx`、`jwt-tool/index.tsx` | 各 ~2 行读深链种子 | Modify |
| `vite.web.config.ts` | `transformIndexHtml` 放宽 CSP(仅 Web) | Modify |
| `docs/spec-checklist.md` | 新增场景清单 | Modify |
| `test/rest-client-*.test.ts(x)`、`test/net-channel.test.ts` | 测试 | Create |

---

### Task 1: 传输契约与错误分类（net-channel.ts + 类型联合）

**Files:**
- Create: `src/renderer/src/core/net-channel.ts`
- Modify: `src/renderer/src/core/types.ts:5`
- Test: `test/net-channel.test.ts`

**Interfaces:**
- Produces: `NetFailKind='timeout'|'aborted'|'network'|'other'`；`NetFetchInit{method?,headers?,body?}`；`NetFetchOk{ok:true,status,statusText,headers,body,bodyBytes,finalUrl}`；`NetFetchError extends Error{kind:NetFailKind}`；`classifyFetchError(err):NetFetchError`；`computeBodyBytes(contentLength:string|null, body:string):number`；`normalizeHeaders(h:Headers):Record<string,string>`；`DEFAULT_TIMEOUT_MS=15000`。

- [ ] **Step 1: 写失败测试** — `test/net-channel.test.ts`

```ts
import { describe, it, expect } from 'vitest'
import { classifyFetchError, computeBodyBytes, NetFetchError, DEFAULT_TIMEOUT_MS } from '@core/net-channel'

describe('classifyFetchError', () => {
  it('AbortError+user-cancel → aborted', () => {
    const e = Object.assign(new Error('canceled'), { name: 'AbortError' })
    expect(classifyFetchError(e).kind).toBe('aborted')
  })
  it('TimeoutError → timeout', () => {
    expect(classifyFetchError(Object.assign(new Error('t'), { name: 'TimeoutError' })).kind).toBe('timeout')
  })
  it('普通 TypeError(Failed to fetch) → network', () => {
    expect(classifyFetchError(Object.assign(new TypeError('Failed to fetch'), { name: 'TypeError' })).kind).toBe('network')
  })
  it('其他 → other', () => {
    expect(classifyFetchError(new Error('weird')).kind).toBe('other')
  })
})

describe('computeBodyBytes', () => {
  it('优先 Content-Length', () => { expect(computeBodyBytes('42', 'x')).toBe(42) })
  it('缺失按 UTF-8 字节数(中文 3 字节)', () => { expect(computeBodyBytes(null, '测试')).toBe(6) })
  it('DEFAULT_TIMEOUT_MS=15000', () => { expect(DEFAULT_TIMEOUT_MS).toBe(15000) })
})
```

- [ ] **Step 2: 运行验证失败** — Run: `pnpm test test/net-channel.test.ts` → Expected: FAIL(模块不存在)

- [ ] **Step 3: 实现 `net-channel.ts`**

```ts
export type NetFailKind = 'timeout' | 'aborted' | 'network' | 'other'
export interface NetFetchInit { method?: string; headers?: Record<string, string>; body?: string }
export interface NetFetchExtra { requestId?: string; timeoutMs?: number }
export interface NetFetchOk {
  ok: true; status: number; statusText: string
  headers: Record<string, string>; body: string; bodyBytes: number; finalUrl: string
}
export const DEFAULT_TIMEOUT_MS = 15000

export class NetFetchError extends Error {
  kind: NetFailKind
  constructor(kind: NetFailKind, message: string) { super(message); this.kind = kind; this.name = 'NetFetchError' }
}

export function classifyFetchError(err: unknown): NetFetchError {
  const e = err as { name?: string; message?: string }
  const name = e?.name ?? ''
  const message = e?.message ?? String(err)
  if (name === 'TimeoutError' || /timeout/i.test(message)) return new NetFetchError('timeout', message)
  if (name === 'AbortError') return /user-cancel|cancel/i.test(message) ? new NetFetchError('aborted', message) : new NetFetchError('aborted', message)
  if (name === 'TypeError' || /network|failed to fetch|enotfound|econnrefused/i.test(message)) return new NetFetchError('network', message)
  return new NetFetchError('other', message)
}

export function computeBodyBytes(contentLength: string | null, body: string): number {
  const n = contentLength != null ? Number(contentLength) : NaN
  if (Number.isFinite(n)) return n
  return new TextEncoder().encode(body).length
}

export function normalizeHeaders(h: Headers): Record<string, string> {
  const out: Record<string, string> = {}
  h.forEach((v, k) => { out[k] = k.toLowerCase() === 'set-cookie' && out[k] ? `${out[k]}, ${v}` : v })
  return out
}
```

- [ ] **Step 4: `types.ts` 联合加 `'rest-client'`**

把 `src/renderer/src/core/types.ts:5` 改为:
```ts
  network?: false | 'search' | 'ai' | 'translate' | 'rest-client'
```

- [ ] **Step 5: 运行验证通过** — Run: `pnpm test test/net-channel.test.ts && pnpm typecheck` → Expected: PASS

- [ ] **Step 6: 提交**

```bash
git add src/renderer/src/core/net-channel.ts src/renderer/src/core/types.ts test/net-channel.test.ts
git commit -m "feat(rest-client): add net-channel transport contract and error classification"
```

---

### Task 2: `httpFetch` 扩展（Web 路径 + httpCancel）

**Files:**
- Modify: `src/renderer/src/core/http.ts`(整体重写)
- Test: `test/http-fetch.test.ts`

**Interfaces:**
- Consumes: `net-channel.ts` 全部导出。
- Produces: `httpFetch(url: string, init?: NetFetchInit, extra?: NetFetchExtra): Promise<NetFetchOk>`（失败抛 `NetFetchError`）；`httpCancel(requestId: string): void`。

- [ ] **Step 1: 写失败测试** — `test/http-fetch.test.ts`

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { httpFetch } from '@core/http'
import { NetFetchError } from '@core/net-channel'

beforeEach(() => { vi.restoreAllMocks() })
afterEach(() => { delete (globalThis as { toolkitAPI?: unknown }).toolkitAPI })

describe('httpFetch (web path)', () => {
  it('成功返回 headers/bodyBytes/finalUrl', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('hi', {
      status: 201, statusText: 'Created', headers: { 'content-length': '2', 'x-a': 'b' }, url: 'http://final'
    })))
    const r = await httpFetch('http://x/y')
    expect(r.ok).toBe(true); expect(r.status).toBe(201)
    expect(r.headers['x-a']).toBe('b'); expect(r.finalUrl).toBe('http://final')
  })
  it('fetch 抛 TypeError → 抛 NetFetchError(network)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw Object.assign(new TypeError('Failed to fetch'), { name: 'TypeError' }) }))
    await expect(httpFetch('http://x')).rejects.toBeInstanceOf(NetFetchError)
  })
  it('无 toolkitAPI 时走浏览器 fetch', async () => {
    const spy = vi.fn(async () => new Response(''))
    vi.stubGlobal('fetch', spy)
    await httpFetch('http://x'); expect(spy).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: 运行验证失败** — Run: `pnpm test test/http-fetch.test.ts` → FAIL(返回结构缺字段/未抛类型)

- [ ] **Step 3: 重写 `http.ts`**

```ts
import { classifyFetchError, computeBodyBytes, normalizeHeaders, NetFetchError, DEFAULT_TIMEOUT_MS } from './net-channel'
import type { NetFetchInit, NetFetchExtra, NetFetchOk } from './net-channel'

interface MainResult { ok: boolean; status: number; statusText?: string; headers?: Record<string, string>; body?: string; bodyBytes?: number; finalUrl?: string; kind?: string; message?: string }
interface TkAPI {
  netFetch?: (p: { url: string; requestId?: string; timeoutMs?: number; init?: NetFetchInit }) => Promise<MainResult>
  netCancel?: (requestId: string) => void
}
const webAborts = new Map<string, AbortController>()

export async function httpFetch(url: string, init?: NetFetchInit, extra?: NetFetchExtra): Promise<NetFetchOk> {
  const timeoutMs = extra?.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const api = (window as { toolkitAPI?: TkAPI }).toolkitAPI
  if (api?.netFetch) {
    const r = await api.netFetch({ url, requestId: extra?.requestId, timeoutMs, init })
    if (!r.ok) throw new NetFetchError((r.kind as NetFetchError['kind']) ?? 'other', r.message ?? `HTTP ${r.status}`)
    const body = r.body ?? ''
    return { ok: true, status: r.status, statusText: r.statusText ?? '', headers: r.headers ?? {}, body, bodyBytes: r.bodyBytes ?? computeBodyBytes(null, body), finalUrl: r.finalUrl ?? url }
  }
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  if (extra?.requestId) webAborts.set(extra.requestId, ctrl)
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal })
    const body = await res.text()
    return { ok: true, status: res.status, statusText: res.statusText, headers: normalizeHeaders(res.headers), body, bodyBytes: computeBodyBytes(res.headers.get('content-length'), body), finalUrl: res.url || url }
  } catch (e) {
    if (ctrl.signal.aborted) throw new NetFetchError('timeout', 'timeout')
    throw classifyFetchError(e)
  } finally {
    clearTimeout(timer); if (extra?.requestId) webAborts.delete(extra?.requestId)
  }
}

export function httpCancel(requestId: string): void {
  webAborts.get(requestId)?.abort('user-cancel'); webAborts.delete(requestId)
  ;(window as { toolkitAPI?: TkAPI }).toolkitAPI?.netCancel?.(requestId)
}
```

- [ ] **Step 4: 运行验证通过** — Run: `pnpm test test/http-fetch.test.ts && pnpm typecheck` → PASS(translate 仍编译:`res.ok`/`res.status`/`res.body` 均在 `NetFetchOk`;失败仍 reject 行为不变)

- [ ] **Step 5: 提交** — `git add src/renderer/src/core/http.ts test/http-fetch.test.ts && git commit -m "feat(rest-client): extend httpFetch with headers/timing/cancel and typed NetFetchError"`

---

### Task 3: Electron main 超时 + 取消通道（IPC 层）

**Files:**
- Modify: `electron/main.ts:86-93`
- Modify: `electron/preload.ts:5-6`

**Interfaces:**
- Consumes: renderer 侧 `NetFetchInit`/`NetFetchExtra` 结构（main 内联同形类型，保持 electron 不 import renderer）。
- Produces: `net-fetch` 接受 `{url,requestId?,timeoutMs?,init}` 返回 `{ok:true,...}|{ok:false,kind,message}`；`net-cancel(requestId):boolean`。

> 说明：electron main 无法用 vitest 直接测(非纯逻辑)，本 Task 以 `pnpm typecheck` + `pnpm build:web` 验证；真实收发/取消/超时在 Task 15 桌面手动验证。逻辑保持与 `net-channel.ts` 同形。

- [ ] **Step 1: 重写 `main.ts` net-fetch 段**

```ts
const inflight = new Map<string, AbortController>()
type MainRes = { ok: boolean; status: number; statusText?: string; headers?: Record<string,string>; body?: string; bodyBytes?: number; finalUrl?: string; kind?: string; message?: string }
ipcMain.handle('net-fetch', async (_e, p: { url: string; requestId?: string; timeoutMs?: number; init?: { method?: string; headers?: Record<string,string>; body?: string } }): Promise<MainRes> => {
  const ac = new AbortController()
  if (p.requestId) inflight.set(p.requestId, ac)
  const timeoutMs = p.timeoutMs ?? 15000
  const signal = AbortSignal.any([ac.signal, AbortSignal.timeout(timeoutMs)])
  try {
    const res = await net.fetch(p.url, { method: p.init?.method ?? 'GET', headers: p.init?.headers, body: p.init?.body, signal })
    const body = await res.text()
    const headers: Record<string,string> = {}
    res.headers.forEach((v, k) => { headers[k] = headers[k] ? `${headers[k]}, ${v}` : v })
    const cl = res.headers.get('content-length')
    return { ok: true, status: res.status, statusText: res.statusText, headers, body, bodyBytes: cl ? Number(cl) : Buffer.byteLength(body, 'utf8'), finalUrl: res.url }
  } catch (err) {
    const e = err as { name?: string; message?: string }
    const kind = /abort/i.test(e.name ?? '') ? 'aborted' : /timeout/i.test(e.message ?? '') ? 'timeout' : 'network'
    return { ok: false, status: 0, kind, message: e.message ?? String(err) }
  } finally { if (p.requestId) inflight.delete(p.requestId) }
})
ipcMain.handle('net-cancel', (_e, requestId: string) => {
  const ac = inflight.get(requestId); if (!ac) return false
  ac.abort('user-cancel'); inflight.delete(requestId); return true
})
```
> `aborted` vs `timeout`：两者都来自 `AbortSignal.any`，`net.fetch` 抛的 name 均为 AbortError。用 `ac.signal.aborted && !timeoutSignalFired` 区分：若需精确，加 `let timedOut=false; timeout 监听置 timedOut=true`，`kind = timedOut?'timeout':'aborted'`。实现时采用该精确版本。

- [ ] **Step 2: `preload.ts` 增 netCancel + 类型**

```ts
  netFetch: (payload: { url: string; requestId?: string; timeoutMs?: number; init?: { method?: string; headers?: Record<string,string>; body?: string } }) =>
    ipcRenderer.invoke('net-fetch', payload),
  netCancel: (requestId: string) => ipcRenderer.invoke('net-cancel', requestId)
```

- [ ] **Step 3: 类型与构建验证** — Run: `pnpm typecheck && pnpm build:web` → Expected: 通过；`node scripts/check-web-purity.mjs dist/web`(build 后)OK

- [ ] **Step 4: 提交** — `git add electron/main.ts electron/preload.ts && git commit -m "feat(rest-client): add net-fetch cancel channel and main-side timeout"`

---

### Task 4: `storageSetChecked`（可见写失败）

**Files:**
- Modify: `src/renderer/src/core/storage.ts`
- Test: `test/storage-checked.test.ts`

**Interfaces:**
- Produces: `storageSetChecked(key: string, value: unknown): { ok: true } | { ok: false; reason: string }`。不改 `storageSet`。

- [ ] **Step 1: 写失败测试** — `test/storage-checked.test.ts`

```ts
import { describe, it, expect } from 'vitest'
import { storageSetChecked } from '@core/storage'
describe('storageSetChecked', () => {
  it('正常写入返回 ok', () => { expect(storageSetChecked('k', { a: 1 })).toEqual({ ok: true }) })
  it('setItem 抛错返回 ok:false 且带 reason', () => {
    const orig = localStorage.setItem; ;(localStorage as { setItem?: unknown }).setItem = () => { throw new Error('QuotaExceededError') }
    const r = storageSetChecked('k', 1); ;(localStorage as { setItem?: unknown }).setItem = orig
    expect(r.ok).toBe(false); if (!r.ok) expect(r.reason).toContain('Quota')
  })
})
```

- [ ] **Step 2: 运行验证失败** — `pnpm test test/storage-checked.test.ts` → FAIL

- [ ] **Step 3: 追加实现到 `storage.ts`**

```ts
export function storageSetChecked(key: string, value: unknown): { ok: true } | { ok: false; reason: string } {
  try { localStorage.setItem(key, JSON.stringify(value)); return { ok: true } }
  catch (e) { return { ok: false, reason: e instanceof Error ? e.message : 'unknown' } }
}
```

- [ ] **Step 4: 运行验证通过** — `pnpm test test/storage-checked.test.ts` → PASS
- [ ] **Step 5: 提交** — `git add src/renderer/src/core/storage.ts test/storage-checked.test.ts && git commit -m "feat(storage): add storageSetChecked for visible write failures"`

---

### Task 5: `env-resolve`（原样替换，零 URL 编码）

**Files:**
- Create: `src/renderer/src/tools/rest-api-client/types.ts`、`env-resolve.ts`
- Test: `test/rest-client-env.test.ts`

**Interfaces:**
- Produces types: `KV{id,key,value}`；`RequestModel{method,url,headers:KV[],body}`；`Env{id,name,vars:Record<string,string>}`；`CollectionNode = GroupNode|RequestNode`；`GroupNode{id,type:'group',name,children:CollectionNode[]}`；`RequestNode{id,type:'request',name,method,url,headers,body}`；`HistoryEntry{id,request:RequestModel,response:{status,statusText,durationMs,sizeBytes,finalUrl,truncatedBody?},envName,at}`；`ResponseModel{...NetFetchOk, durationMs, kind?}`。
- Produces: `resolveVars(text: string, vars: Record<string,string>): { resolved: string; undefinedVars: string[] }`。

- [ ] **Step 1: 写 `types.ts`**（上述接口，`export interface`/`export type` 逐条；`import type { NetFetchOk } from '@core/net-channel'`）

- [ ] **Step 2: 写失败测试** — `test/rest-client-env.test.ts`

```ts
import { describe, it, expect } from 'vitest'
import { resolveVars } from '@tools/rest-api-client/env-resolve'
describe('resolveVars', () => {
  it('baseUrl 值不被编码', () => {
    expect(resolveVars('{{baseUrl}}/users', { baseUrl: 'https://api.dev.com' })).toEqual({ resolved: 'https://api.dev.com/users', undefinedVars: [] })
  })
  it('未定义变量列出且原样保留', () => {
    const r = resolveVars('a={{x}}&b={{y}}', { x: '1' })
    expect(r.resolved).toBe('a=1&b={{y}}'); expect(r.undefinedVars).toEqual(['y'])
  })
  it('body/headers 同样替换', () => {
    expect(resolveVars('{"t":"{{tk}}"}', { tk: 'abc' }).resolved).toBe('{"t":"abc"}')
  })
})
```

- [ ] **Step 3: 运行验证失败** — `pnpm test test/rest-client-env.test.ts` → FAIL

- [ ] **Step 4: 实现 `env-resolve.ts`**

```ts
export function resolveVars(text: string, vars: Record<string, string>): { resolved: string; undefinedVars: string[] } {
  const undefinedVars: string[] = []
  const resolved = (text ?? '').replace(/\{\{\s*([^}\s]+)\s*\}\}/g, (_m, key: string) => {
    if (Object.prototype.hasOwnProperty.call(vars, key)) return vars[key]
    if (!undefinedVars.includes(key)) undefinedVars.push(key)
    return `{{${key}}}`
  })
  return { resolved, undefinedVars }
}
```

- [ ] **Step 5: 运行验证通过** — `pnpm test test/rest-client-env.test.ts` → PASS
- [ ] **Step 6: 提交** — `git add src/renderer/src/tools/rest-api-client/types.ts src/renderer/src/tools/rest-api-client/env-resolve.ts test/rest-client-env.test.ts && git commit -m "feat(rest-client): env var template resolution (raw, no url-encoding)"`

---

### Task 6: `query-params`（手写拆分，保留 `{{}}`）

**Files:**
- Create: `src/renderer/src/tools/rest-api-client/query-params.ts`
- Test: `test/rest-client-query.test.ts`

**Interfaces:**
- Consumes: `KV`。
- Produces: `parseQuery(url: string): { base: string; params: KV[] }`；`serializeQuery(base: string, params: KV[]): string`；`newKv(): KV`(id via crypto.randomUUID)。

- [ ] **Step 1: 写失败测试** — `test/rest-client-query.test.ts`

```ts
import { describe, it, expect } from 'vitest'
import { parseQuery, serializeQuery } from '@tools/rest-api-client/query-params'
const val = (url: string) => parseQuery(url).params.map(p => `${p.key}=${p.value}`)
describe('query-params', () => {
  it('拆分含变量,花括号不被编码', () => {
    expect(val('{{baseUrl}}/search?q={{kw}}&page=2')).toEqual(['q={{kw}}', 'page=2'])
  })
  it('round-trip 保结构', () => {
    const url = '{{b}}/x?a=1&flag=true'
    const { base, params } = parseQuery(url)
    expect(serializeQuery(base, params)).toBe(url)
  })
  it('无 query 返回空 params', () => {
    expect(parseQuery('http://a/b')).toEqual({ base: 'http://a/b', params: [] })
  })
  it('值含已编码内容原样保留(不 double-encode)', () => {
    expect(val('x?a=%E4%B8%AD')).toEqual(['a=%E4%B8%AD'])
  })
})
```

- [ ] **Step 2: 运行验证失败** — `pnpm test test/rest-client-query.test.ts` → FAIL

- [ ] **Step 3: 实现 `query-params.ts`**

```ts
import type { KV } from './types'
export function newKv(key = '', value = ''): KV { return { id: crypto.randomUUID(), key, value } }
export function parseQuery(url: string): { base: string; params: KV[] } {
  const i = (url ?? '').indexOf('?')
  if (i === -1) return { base: url ?? '', params: [] }
  const base = url.slice(0, i)
  const params = url.slice(i + 1).split('&').filter(s => s !== '').map(seg => { const eq = seg.indexOf('='); return eq === -1 ? newKv(seg, '') : newKv(seg.slice(0, eq), seg.slice(eq + 1)) })
  return { base, params }
}
export function serializeQuery(base: string, params: KV[]): string {
  const q = params.filter(p => p.key !== '').map(p => `${p.key}=${p.value}`).join('&')
  return q ? `${base}?${q}` : base
}
```

- [ ] **Step 4: 运行验证通过** — `pnpm test test/rest-client-query.test.ts` → PASS
- [ ] **Step 5: 提交** — `git add src/renderer/src/tools/rest-api-client/query-params.ts test/rest-client-query.test.ts && git commit -m "feat(rest-client): manual query param parse/serialize preserving {{var}}"`

---

### Task 7: `curl-parse`（bash 方言 + ANSI-C）

**Files:**
- Create: `src/renderer/src/tools/rest-api-client/curl-parse.ts`
- Test: `test/rest-client-curl.test.ts`

**Interfaces:**
- Consumes: `RequestModel`, `KV`(types.ts)。
- Produces: `parseCurl(text: string): ToolResult<RequestModel>`。

- [ ] **Step 1: 写失败测试（bash 子集）** — `test/rest-client-curl.test.ts`

```ts
import { describe, it, expect } from 'vitest'
import { parseCurl } from '@tools/rest-api-client/curl-parse'
const ok = (t: string) => { const r = parseCurl(t); if (r.status !== 'ok') throw new Error(JSON.stringify(r)); return r.data }
describe('curl-parse bash', () => {
  it('解析 Chrome bash GET', () => {
    const d = ok(`curl 'https://api.x.com/u' \\\n  -H 'accept: application/json' \\\n  --compressed`)
    expect(d.method).toBe('GET'); expect(d.url).toBe('https://api.x.com/u'); expect(d.headers[0].key).toBe('accept')
  })
  it('--data-raw 触发 POST + body', () => {
    const d = ok(`curl 'https://x' --data-raw '{"a":1}'`)
    expect(d.method).toBe('POST'); expect(d.body).toBe('{"a":1}')
  })
  it('-b 转 Cookie 头', () => { const d = ok(`curl 'https://x' -b 'sid=9'`); expect(d.headers.find(h => h.key.toLowerCase() === 'cookie')?.value).toBe('sid=9') })
  it('-X 覆盖', () => { expect(ok(`curl -X PUT 'https://x'`).method).toBe('PUT') })
  it('非 curl 输入 → invalid-input', () => { expect(parseCurl('hello world').status).toBe('error') })
})
```

- [ ] **Step 2: 运行验证失败** — `pnpm test test/rest-client-curl.test.ts` → FAIL

- [ ] **Step 3: 实现 `curl-parse.ts`（bash 部分 + 分词状态机）**

```ts
import type { ToolResult } from '@core/types'
import type { RequestModel, KV } from './types'
const newKv = (key: string, value: string): KV => ({ id: crypto.randomUUID(), key, value })

// 分词:支持 '...'、"..."、$'...'、^"..."(cmd)、裸词;返回 token 数组
export function tokenize(input: string): string[] {
  const src = input.replace(/\\\r?\n/g, ' ').replace(/\^\r?\n/g, ' ') // 续行: bash \ 与 cmd ^
  const toks: string[] = []; let i = 0; const n = src.length
  while (i < n) {
    while (i < n && /\s/.test(src[i])) i++
    if (i >= n) break
    let tok = ''
    while (i < n && !/\s/.test(src[i])) {
      const c = src[i]
      if (c === "$" && src[i + 1] === "'") { i += 2; while (i < n && src[i] !== "'") { tok += src[i] === "\\" ? decodeAnsi(src, (i += 2), (v => { tok += v })) : src[i++]; } i++; continue }
      if (c === "'" || c === '"' || (c === '^' && src[i + 1] === '"')) {
        const q = c === '^' ? '"' : c; if (c === '^') i++
        i++; const esc = q === '"'
        while (i < n && src[i] !== q) { if (esc && src[i] === '\\') { const nx = src[i + 1]; tok += nx === '\\' ? '\\' : (nx === '"' ? '"' : '\\' + (nx ?? '')); i += 2; continue } if (esc && src[i] === '^') { tok += '"'; i += 2; continue } tok += src[i++] }
        i++; continue
      }
      tok += c; i++
    }
    toks.push(tok)
  }
  return toks.filter(t => t !== '')
}
function decodeAnsi(s: string, start: number, push: (v: string) => void): number {
  // 简化:\\n \\t \\' \\\\ \\xNN 处理
  let out = ''; let i = start
  return i
}
```
> 上面为骨架。**实现时** `decodeAnsi` 与 cmd `^"` 需完整处理(golden 覆盖)；多个 `-d` 取最后一个；`-F`/`--form`/`-d @file` → 见 Task 8 的 `unsupported` 分支。curl-parse 有 body(`--data*`)且无 `-X` → method=POST；有 `-X` 用其值；否则 GET。header 值按首个 `:` 拆分并 trim。**必须返回 `ToolResult`**:解析不出 `curl` 开头或无 URL → `{status:'error',kind:'invalid-input',message:'不是有效的 cURL 命令'}`。

- [ ] **Step 4: 运行验证通过** — `pnpm test test/rest-client-curl.test.ts` → PASS(bash 子集全绿)
- [ ] **Step 5: 提交** — `git add src/renderer/src/tools/rest-api-client/curl-parse.ts test/rest-client-curl.test.ts && git commit -m "feat(rest-client): curl import parser (bash dialect)"`

---

### Task 8: `curl-parse` cmd 方言 + 边界（multipart/PowerShell/文件引用）

**Files:**
- Modify: `src/renderer/src/tools/rest-api-client/curl-parse.ts`
- Test: `test/rest-client-curl.test.ts`(追加)

- [ ] **Step 1: 追加失败测试**

```ts
describe('curl-parse cmd + edges', () => {
  it('cmd 方言与等价 bash 结果一致', () => {
    const bash = parseCurl(`curl 'https://x' -H 'a: b' --data-raw '{"k":"v"}'`)
    const cmd = parseCurl(`curl ^"https://x^" ^\n  -H ^"a: b^" ^\n  --data-raw ^"{\\^"k\\^":\\^"v\\^"}^"`)
    expect(cmd).toEqual(bash)
  })
  it('-F → unsupported', () => { const r = parseCurl(`curl 'https://x' -F f=@a.txt`); expect(r.status === 'error' && r.kind).toBe('unsupported') })
  it('PowerShell → invalid/unsupported 提示 bash', () => { const r = parseCurl(`Invoke-WebRequest -Uri 'https://x' -Method GET`); expect(r.status).toBe('error') })
  it('多个 --data 取最后', () => { const r = parseCurl(`curl 'x' --data 'a' --data 'b'`); if (r.status === 'ok') expect(r.data.body).toBe('b') })
})
```

- [ ] **Step 2: 运行验证失败** — `pnpm test test/rest-client-curl.test.ts` → FAIL
- [ ] **Step 3: 补完 `curl-parse.ts`**：tokenize 完成 cmd `\^"` 与 ANSI-C 转义；主循环遇 `-F`/`--form` 立即返回 `{kind:'unsupported',structure:'multipart',message:'v1 不支持 multipart 文件上传'}`；遇 `-d`/`--data*` 以 `@` 开头 → unsupported「不支持文件引用」；首 token 非 `curl` 但命中 `Invoke-WebRequest`/`-Uri` → invalid-input 附「请用浏览器 Copy as cURL (bash)」；多 body 取最后。
- [ ] **Step 4: 运行验证通过** — `pnpm test test/rest-client-curl.test.ts` → 全绿
- [ ] **Step 5: 提交** — `git commit -am "feat(rest-client): curl parser cmd dialect + edge rejections"`

---

### Task 9: `curl-build` + 导入导出 round-trip

**Files:**
- Create: `src/renderer/src/tools/rest-api-client/curl-build.ts`
- Test: `test/rest-client-curl.test.ts`(追加)

**Interfaces:**
- Consumes: `RequestModel`。
- Produces: `buildCurl(req: RequestModel): string`(bash 方言)。

- [ ] **Step 1: 追加 round-trip 测试**

```ts
import { buildCurl } from '@tools/rest-api-client/curl-build'
describe('curl round-trip', () => {
  it('build→parse 语义一致', () => {
    const req: RequestModel = { method: 'POST', url: 'https://x/a?b=1', headers: [{ id: '1', key: 'content-type', value: 'application/json' }], body: '{"k":"v"}' }
    const back = parseCurl(buildCurl(req)); if (back.status !== 'ok') throw new Error('parse fail')
    expect(back.data.method).toBe('POST'); expect(back.data.url).toBe('https://x/a?b=1'); expect(back.data.body).toBe('{"k":"v"}')
    expect(back.data.headers.find(h => h.key === 'content-type')?.value).toBe('application/json')
  })
})
```

- [ ] **Step 2: 运行验证失败** — FAIL
- [ ] **Step 3: 实现 `curl-build.ts`**

```ts
import type { RequestModel } from './types'
const sq = (s: string) => `'${s.replace(/'/g, "'\\''")}'`
export function buildCurl(req: RequestModel): string {
  const lines = [`curl ${sq(req.url)}`]
  if (req.method !== 'GET') lines.push(`  -X ${req.method}`)
  for (const h of req.headers) if (h.key) lines.push(`  -H ${sq(`${h.key}: ${h.value}`)}`)
  if (req.body) lines.push(`  --data-raw ${sq(req.body)}`)
  return lines.join(' \\\n')
}
```

- [ ] **Step 4: 运行验证通过** — `pnpm test test/rest-client-curl.test.ts` → PASS
- [ ] **Step 5: 提交** — `git add src/renderer/src/tools/rest-api-client/curl-build.ts test/rest-client-curl.test.ts && git commit -m "feat(rest-client): curl export + import/export round-trip"`

---

### Task 10: store（集合树/环境/历史 + 写状态 + 持久化）

**Files:**
- Create: `src/renderer/src/tools/rest-api-client/store.ts`
- Test: `test/rest-client-store.test.ts`

**Interfaces:**
- Consumes: `types.ts`, `storage.storageSetChecked`。
- Produces: `useRestStore`(zustand persist)，state `{ collections: GroupNode[], environments: Env[], activeEnvId: string, history: HistoryEntry[], writeFailed: boolean }` + actions `{ addGroup(parentId,name), addRequest(parentId, req), rename(id,name), move(id,destParentId), remove(id), addEnv(name), setEnvVars(id,vars), deleteEnv(id), setActiveEnv(id), pushHistory(entry), loadRequest(req), markWriteFailed() }`。历史上限 50、body 快照截断 10KB、不存响应 body。

- [ ] **Step 1: 写失败测试** — `test/rest-client-store.test.ts`

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useRestStore, HISTORY_CAP, HISTORY_BODY_CAP } from '@tools/rest-api-client/store'
beforeEach(() => { localStorage.clear(); useRestStore.setState({ collections: [], environments: [], history: [], activeEnvId: '' }) })
const big = (n: number) => 'x'.repeat(n)
describe('rest store', () => {
  it('历史超 50 淘汰最旧', () => { for (let i = 0; i < 55; i++) useRestStore.getState().pushHistory({ id: 'h' + i, request: { method: 'GET', url: 'u', headers: [], body: '' }, response: { status: 200, statusText: '', durationMs: 1, sizeBytes: 1, finalUrl: 'u' }, envName: 'x', at: i } as never); expect(useRestStore.getState().history.length).toBe(HISTORY_CAP) })
  it('历史 body 超 10KB 截断标 truncated', () => { useRestStore.getState().pushHistory({ id: 'h', request: { method: 'POST', url: 'u', headers: [], body: big(20000) }, response: { status: 200, statusText: '', durationMs: 1, sizeBytes: 1, finalUrl: 'u' }, envName: 'x', at: 1 } as never); const h = useRestStore.getState().history[0]; expect(h.request.body.length).toBe(HISTORY_BODY_CAP) })
  it('集合树 add/remove', () => { const s = useRestStore.getState(); s.addGroup('', '租户'); const gid = useRestStore.getState().collections[0].id; s.addRequest(gid, { id: 'r1', type: 'request', name: '登录', method: 'POST', url: '{{baseUrl}}/login', headers: [], body: '' }); expect((useRestStore.getState().collections[0] as { children?: unknown[] }).children?.length).toBe(1) })
  it('写失败标记', () => { useRestStore.getState().markWriteFailed(); expect(useRestStore.getState().writeFailed).toBe(true) })
})
```

- [ ] **Step 2: 运行验证失败** — `pnpm test test/rest-client-store.test.ts` → FAIL

- [ ] **Step 3: 实现 `store.ts`**

```ts
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { storageGetRaw, storageSetRaw, storageRemove, storageSetChecked } from '@core/storage'
import type { GroupNode, Env, HistoryEntry, RequestModel } from './types'
export const HISTORY_CAP = 50
export const HISTORY_BODY_CAP = 10 * 1024
const uid = () => crypto.randomUUID()
const trunc = (m: RequestModel): RequestModel => m.body.length > HISTORY_BODY_CAP ? { ...m, body: m.body.slice(0, HISTORY_BODY_CAP), } : m

interface State {
  collections: GroupNode[]; environments: Env[]; activeEnvId: string; history: HistoryEntry[]; writeFailed: boolean
  addGroup: (parentId: string, name: string) => void
  addRequest: (parentId: string, req: Omit<import('./types').RequestNode, 'type'>) => void
  rename: (id: string, name: string) => void
  move: (id: string, destParentId: string) => void
  remove: (id: string) => void
  addEnv: (name: string) => void
  setEnvVars: (id: string, vars: Record<string, string>) => void
  deleteEnv: (id: string) => void
  setActiveEnv: (id: string) => void
  pushHistory: (e: HistoryEntry) => void
  markWriteFailed: () => void
}
function insert(nodes: GroupNode[], parentId: string, child: GroupNode | import('./types').RequestNode): GroupNode[] {
  if (!parentId) return [...nodes, child as GroupNode]
  return nodes.map(nd => nd.id === parentId ? { ...nd, children: [...(nd.children || []), child] } : { ...nd, children: insert(nd.children || [], parentId, child) })
}
function removeNode(nodes: GroupNode[], id: string): GroupNode[] { return nodes.filter(nd => nd.id !== id).map(nd => nd.id === id ? nd : { ...nd, children: removeNode(nd.children || [], id) }) }
function findNode(nodes: GroupNode[], id: string): GroupNode | import('./types').RequestNode | undefined {
  for (const nd of nodes) { if (nd.id === id) return nd; const f = findNode(nd.children || [], id); if (f) return f }
  return undefined
}

export const useRestStore = create<State>()(persist((set, get) => ({
  collections: [], environments: [], activeEnvId: '', history: [], writeFailed: false,
  addGroup: (pid, name) => set(s => ({ collections: insert(s.collections, pid, { id: uid(), type: 'group', name, children: [] }) })),
  addRequest: (pid, req) => set(s => ({ collections: insert(s.collections, pid, { ...req, type: 'request' }) })),
  rename: (id, name) => { const n = findNode(get().collections, id); if (n && 'name' in n) { n.name = name; set({ collections: [...get().collections] }) } },
  move: (id, dest) => { const n = findNode(get().collections, id); if (!n) return; set(s => ({ collections: insert(removeNode(s.collections, id), dest, n) })) },
  remove: id => set(s => ({ collections: removeNode(s.collections, id) })),
  addEnv: name => set(s => { const e = { id: uid(), name, vars: {} }; return { environments: [...s.environments, e], activeEnvId: s.activeEnvId || e.id } }),
  setEnvVars: (id, vars) => set(s => ({ environments: s.environments.map(e => e.id === id ? { ...e, vars } : e) })),
  deleteEnv: id => set(s => { const rest = s.environments.filter(e => e.id !== id); return { environments: rest, activeEnvId: s.activeEnvId === id ? rest[0]?.id ?? '' : s.activeEnvId } }),
  setActiveEnv: id => set({ activeEnvId: id }),
  pushHistory: e => set(s => ({ history: [{ ...e, request: trunc(e.request) }, ...s.history].slice(0, HISTORY_CAP) })),
  markWriteFailed: () => set({ writeFailed: true })
}), {
  name: 'toolkit.rest-client',
  storage: createJSONStorage(() => ({
    getItem: k => storageGetRaw(k),
    setItem: (k, v) => { const r = storageSetChecked(k, JSON.parse(v)); if (!r.ok) useRestStore.getState().markWriteFailed() },
    removeItem: k => storageRemove(k)
  }))
}))
```

- [ ] **Step 4: 运行验证通过** — `pnpm test test/rest-client-store.test.ts && pnpm typecheck` → PASS
- [ ] **Step 5: 提交** — `git add src/renderer/src/tools/rest-api-client/store.ts test/rest-client-store.test.ts && git commit -m "feat(rest-client): zustand store (collections/env/history) with visible write failure"`

---

### Task 11: 导入/导出（version 校验 + 按 id 合并 + token 警告）

**Files:**
- Modify: `src/renderer/src/tools/rest-api-client/store.ts`
- Test: `test/rest-client-export.test.ts`

**Interfaces:**
- Produces: `exportBundle(): string`；`importBundle(json: string): { ok: true } | { ok: false; reason: string }`(先整体校验后原子提交)；`bundleHasSecrets(): boolean`。

- [ ] **Step 1: 写失败测试** — `test/rest-client-export.test.ts`

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useRestStore, exportBundle, importBundle, bundleHasSecrets } from '@tools/rest-api-client/store'
beforeEach(() => { localStorage.clear(); useRestStore.setState({ collections: [], environments: [], history: [], activeEnvId: '' }) })
describe('bundle import/export', () => {
  it('导出清空再导入还原', () => {
    useRestStore.getState().addEnv('dev'); useRestStore.getState().setEnvVars(useRestStore.getState().environments[0].id, { tk: 'secret' })
    const snap = JSON.stringify(useRestStore.getState().collections) + JSON.stringify(useRestStore.getState().environments)
    const b = exportBundle(); useRestStore.setState({ environments: [], collections: [] })
    expect(importBundle(b).ok).toBe(true); expect(JSON.stringify(useRestStore.getState().environments)).toBe(snap)
    expect(bundleHasSecrets()).toBe(true)
  })
  it('非法 bundle 不污染', () => { useRestStore.getState().addEnv('keep'); const r = importBundle('{"nope":1}'); expect(r.ok).toBe(false); expect(useRestStore.getState().environments.length).toBe(1) })
  it('同名共存不覆盖', () => { useRestStore.getState().addEnv('dev'); useRestStore.getState().addEnv('dev'); expect(useRestStore.getState().environments.length).toBe(2) })
})
```

- [ ] **Step 2: 运行验证失败** — FAIL
- [ ] **Step 3: 实现**：`exportBundle` 输出 `{version:1, exportedAt, collections, environments}`；`importBundle` JSON.parse 失败或 `version!==1` 或缺 collections/environments 数组 → `{ok:false,reason}`；通过后**按 id 合并**(已存在同 id 跳过，新 id 追加，天然实现同名共存因新建 id 唯一)整体 `set` 一次(原子)。`bundleHasSecrets` = 任一 env.vars 非空值。
- [ ] **Step 4: 运行验证通过** — PASS
- [ ] **Step 5: 提交** — `git commit -am "feat(rest-client): bundle export/import with validation and id-merge"`

---

### Task 12: `http-client`（组装 + resolve + 映射 + 取消 + 防重）

**Files:**
- Create: `src/renderer/src/tools/rest-api-client/http-client.ts`
- Test: `test/rest-client-http.test.ts`

**Interfaces:**
- Consumes: `httpFetch`/`httpCancel`、`resolveVars`、`net-channel.NetFetchError`、`RequestModel`/`Env`。
- Produces: `sendRequest(req: RequestModel, env: Env | undefined, opts: { timeoutMs: number }): Promise<ToolResult<ResponseModel>>`；`cancelCurrent(): void`；内部维护当前 requestId。

- [ ] **Step 1: 写失败测试** — `test/rest-client-http.test.ts`

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as hc from '@tools/rest-api-client/http-client'
import * as http from '@core/http'
import { NetFetchError } from '@core/net-channel'
vi.mock('@core/http')
beforeEach(() => vi.mocked(http.httpFetch).mockReset())
const req = { method: 'GET', url: '{{baseUrl}}/u', headers: [], body: '' }
describe('sendRequest', () => {
  it('解析变量后发送,URL 不被编码', async () => {
    vi.mocked(http.httpFetch).mockResolvedValue({ ok: true, status: 200, statusText: 'OK', headers: {}, body: '{}', bodyBytes: 2, finalUrl: 'https://api/u' })
    const r = await hc.sendRequest(req as never, { id: 'e', name: 'dev', vars: { baseUrl: 'https://api' } } as never, { timeoutMs: 15000 })
    expect(r.status).toBe('ok'); expect(vi.mocked(http.httpFetch).mock.calls[0][0]).toBe('https://api/u')
  })
  it('NetFetchError → error ToolResult 带 kind 文案', async () => {
    vi.mocked(http.httpFetch).mockRejectedValue(new NetFetchError('timeout', 'x'))
    const r = await hc.sendRequest(req as never, undefined as never, { timeoutMs: 15000 })
    expect(r.status).toBe('error'); if (r.status === 'error') expect(r.message).toContain('超时')
  })
  it('4xx 是 ok(正常响应)', async () => {
    vi.mocked(http.httpFetch).mockResolvedValue({ ok: true, status: 404, statusText: 'NF', headers: {}, body: '', bodyBytes: 0, finalUrl: 'u' })
    expect((await hc.sendRequest({ ...req, url: 'u' } as never, undefined as never, { timeoutMs: 15000 })).status).toBe('ok')
  })
})
```

- [ ] **Step 2: 运行验证失败** — FAIL
- [ ] **Step 3: 实现 `http-client.ts`**

```ts
import { httpFetch, httpCancel } from '@core/http'
import { NetFetchError } from '@core/net-channel'
import type { NetFetchOk } from '@core/net-channel'
import { resolveVars } from './env-resolve'
import type { RequestModel, Env, ResponseModel } from './types'
import type { ToolResult } from '@core/types'
let currentId = ''
const KIND_MSG: Record<string, string> = { timeout: '请求超时', aborted: '已取消', network: '网络不可达或被浏览器拦截(CORS/mixed-content/网络)。桌面版不受此限制', other: '请求失败' }
export async function sendRequest(req: RequestModel, env: Env | undefined, opts: { timeoutMs: number }): Promise<ToolResult<ResponseModel>> {
  const vars = env?.vars ?? {}
  const requestId = crypto.randomUUID(); currentId = requestId
  const u = resolveVars(req.url, vars)
  const headers: Record<string, string> = {}; const undef = [...u.undefinedVars]
  for (const h of req.headers) { if (!h.key) continue; const r = resolveVars(h.value, vars); headers[h.key] = r.resolved; undef.push(...r.undefinedVars) }
  const b = resolveVars(req.body, vars); undef.push(...b.undefinedVars)
  const t0 = Date.now()
  try {
    const res: NetFetchOk = await httpFetch(u.resolved, { method: req.method, headers, body: b.resolved || undefined }, { requestId, timeoutMs: opts.timeoutMs })
    return { status: 'ok', data: { ...res, durationMs: Date.now() - t0 } }
  } catch (e) {
    if (e instanceof NetFetchError) return { status: 'error', kind: 'engine', message: KIND_MSG[e.kind] ?? e.message }
    return { status: 'error', kind: 'engine', message: String(e) }
  } finally { if (currentId === requestId) currentId = '' }
}
export function cancelCurrent(): void { if (currentId) httpCancel(currentId) }
```

- [ ] **Step 4: 运行验证通过** — PASS
- [ ] **Step 5: 提交** — `git add src/renderer/src/tools/rest-api-client/http-client.ts test/rest-client-http.test.ts && git commit -m "feat(rest-client): request orchestration with env resolution and error mapping"`

---

### Task 13: 深链（useLiveTransform initial + deep-link.ts）

**Files:**
- Modify: `src/renderer/src/core/useLiveTransform.ts:5-6`
- Create: `src/renderer/src/tools/rest-api-client/deep-link.ts`
- Modify: `src/renderer/src/tools/json-parser/index.tsx:8`、`jwt-tool/index.tsx:13`
- Test: `test/rest-client-deeplink.test.ts`

**Interfaces:**
- Consumes/Produces: `useLiveTransform<I,O>(toolId: string, initial?: I)`；`writeDeepLink(targetId: string, payload: string): void`(try/catch，超配额抛降级信号)；`readDeepLink(targetId: string): string | null`(读即删)。

- [ ] **Step 1: 写失败测试** — `test/rest-client-deeplink.test.ts`

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { writeDeepLink, readDeepLink } from '@tools/rest-api-client/deep-link'
beforeEach(() => sessionStorage.clear())
describe('deep-link', () => {
  it('写后读一次即清', () => { writeDeepLink('json-parser', '{"a":1}'); expect(readDeepLink('json-parser')).toBe('{"a":1}'); expect(readDeepLink('json-parser')).toBeNull() })
})
```

- [ ] **Step 2: 运行验证失败** — FAIL
- [ ] **Step 3: 实现 `deep-link.ts`**

```ts
const KEY = (id: string) => `toolkit.deepLink.${id}`
export function writeDeepLink(targetId: string, payload: string): boolean {
  try { sessionStorage.setItem(KEY(targetId), payload); return true }
  catch { return false } // 超配额:调用方降级(如仅传选中文本)
}
export function readDeepLink(targetId: string): string | null {
  const k = KEY(targetId); const v = sessionStorage.getItem(k); if (v != null) sessionStorage.removeItem(k); return v
}
```

- [ ] **Step 4: `useLiveTransform` 加 initial**

`src/renderer/src/core/useLiveTransform.ts` 签名改 `useLiveTransform<I, O>(toolId: string, initial?: I)`；`useState<I>(...)` 初值改 `useState<I>((initial ?? '' as unknown as I))`。其余不变(mount 的 opts effect 会对非空 initial 立即 `run`)。

- [ ] **Step 5: 目标页读取种子**

json-parser/index.tsx：`const seed = readDeepLink('json-parser');` 组件外不可，放组件内首行 `const [seed] = useState(() => readDeepLink('json-parser'));` 并 `useLiveTransform<string,string>('json-parser', seed ?? undefined)`。jwt-tool 同(`useLiveTransform<string,JwtResult>('jwt-tool', seed ?? undefined)`)。
> 深链写入在 ResponsePanel(Task 14)：JSON→整个 body；JWT→选中文本 fallback body；`writeDeepLink` 返回 false 时降级为仅写 selection 并提示。

- [ ] **Step 6: 运行验证通过** — `pnpm test test/rest-client-deeplink.test.ts && pnpm typecheck` → PASS
- [ ] **Step 7: 提交** — `git add -A src/renderer/src/core/useLiveTransform.ts src/renderer/src/tools/rest-api-client/deep-link.ts src/renderer/src/tools/json-parser/index.tsx src/renderer/src/tools/jwt-tool/index.tsx test/rest-client-deeplink.test.ts && git commit -m "feat(rest-client): cross-tool deep-link via sessionStorage seed"`

---

### Task 14: 三栏 UI + 编辑模型 + 快捷键 + 响应面板

**Files:**
- Create: `index.tsx`、`icon.tsx`、`components/{Sidebar,RequestPanel,ResponsePanel}.tsx`
- Test: `test/rest-client-ui.test.tsx`

**Interfaces:**
- Consumes: store、sendRequest/cancelCurrent、query-params、curl-parse/build、writeDeepLink。
- Produces: 默认导出 `RestApiClientPage`(注册用)。

- [ ] **Step 1: 写 jsdom 交互测试(核心不冻结+dirty 确认+快捷键)** — `test/rest-client-ui.test.tsx`

```tsx
// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, fireEvent, screen, cleanup } from '@testing-library/react'
import RestApiClientPage from '@tools/rest-api-client'
import { useRestStore } from '@tools/rest-api-client/store'
afterEach(() => { cleanup(); useRestStore.setState({ writeFailed: false }) })
vi.mock('@core/http', () => ({ httpFetch: vi.fn(async () => ({ ok: true, status: 200, statusText: 'OK', headers: {}, body: '{}', bodyBytes: 2, finalUrl: 'u' })), httpCancel: vi.fn() }))
describe('rest client UI', () => {
  it('渲染三栏关键控件', () => { render(<RestApiClientPage />); expect(screen.getByTestId('method-select')).toBeTruthy(); expect(screen.getByTestId('send-btn')).toBeTruthy() })
  it('修改 URL 后 dirty=true,切换集合项触发确认(window.confirm)', () => {
    const spy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<RestApiClientPage />)
    fireEvent.change(screen.getByTestId('url-input'), { target: { value: 'https://x/a' } })
    fireEvent.click(screen.getByTestId('new-request-btn'))
    expect(spy).toHaveBeenCalled(); spy.mockRestore()
  })
  it('Ctrl+Enter 发送', async () => {
    render(<RestApiClientPage />)
    fireEvent.keyDown(screen.getByTestId('url-input'), { key: 'Enter', ctrlKey: true })
    await screen.findByText(/200/)
  })
})
```

- [ ] **Step 2: 运行验证失败** — `pnpm test test/rest-client-ui.test.tsx` → FAIL
- [ ] **Step 3: 实现 UI**
  - `icon.tsx`：仿 `jwt-tool/icon.tsx` 一个 svg 组件。
  - `RequestPanel`：`data-testid="method-select"`(GET/POST/PUT/PATCH/DELETE/HEAD/OPTIONS)、`url-input`、query 参数表(用 parseQuery/serializeQuery 双向)、headers KV 表、body textarea + 格式化按钮、`send-btn`。`data-testid="curl-import"`(textarea 粘贴→parseCurl 回填)、`curl-export-btn`(buildCurl→复制)、超时下拉(5/10/15/30/60s)。
  - `ResponsePanel`：状态色条(2xx success/4·5xx error)、耗时、大小、finalUrl、headers 折叠、body(JSON 命中用 `JsonView`)、`CopyButton`；`writeFailed` 时顶部 amber 警告条；`>1MB` 截断显示 + 提示。
  - `Sidebar`：环境下拉(activeEnvId)+ 集合树(递归展开,点项载入草稿)+ 历史列表(点回填)+ `new-request-btn`。
  - `index.tsx`：活动草稿 state(method/url/headers/body) + `dirty`;从集合载入副本;`confirmDiscardIfDirty()` 在载入其它/新建前调用;`send()` 调 sendRequest→pushHistory→设响应;`Ctrl/Cmd+Enter` keydown;发送中 `sending` 禁用按钮与快捷键;卸载 `cancelCurrent()`。
- [ ] **Step 4: 运行验证通过** — `pnpm test test/rest-client-ui.test.tsx` → PASS
- [ ] **Step 5: 提交** — `git add -A src/renderer/src/tools/rest-api-client && git commit -m "feat(rest-client): three-pane UI with edit model, shortcut, deep-link buttons"`

---

### Task 15: 注册 + Web CSP + 文档 + 全量验证

**Files:**
- Modify: `src/renderer/src/tools/register.ts`
- Modify: `vite.web.config.ts`
- Modify: `docs/spec-checklist.md`

**Interfaces:** 无新导出。

- [ ] **Step 1: register.ts 追加**(仿 translate 三处:import icon、lazy 组件、数组项 `capability:{offline:false,network:'rest-client'}`)
- [ ] **Step 2: `vite.web.config.ts` 加 transformIndexHtml**

```ts
transformIndexHtml(html) { return html.replace(/connect-src[^;]*;/, "connect-src *;") }
```
(仅 Web 构建插件内；桌面 index.html 的 CSP 不动)

- [ ] **Step 3: `docs/spec-checklist.md`** 追加 rest-api-client / net-fetch-channel 场景清单，并把「联网工具导航标识」人工项标记为本工具上线验证(第 2 个联网工具)。
- [ ] **Step 4: 全量绿** — Run: `pnpm test && pnpm typecheck && pnpm build:web && node scripts/check-web-purity.mjs dist/web` → Expected: 全绿；21 工具零回归
- [ ] **Step 5: 桌面手动验证**(记入 checklist)：内网无 CORS 接口收发、取消在途请求、超时 5s、切换环境 URL 变化、深链跳 JSON/JWT、cURL 双方言粘贴。
- [ ] **Step 6: 提交** — `git add -A && git commit -m "feat(rest-client): register tool, relax web CSP, update spec-checklist"`

---

## Self-Review

**Spec 覆盖核对(net-fetch-channel 5 + rest-api-client 16 = 21 需求)**：
- 传输：Task1(分类/bodyBytes/headers)、Task2(httpFetch/cancel)、Task3(超时/取消 IPC/4xx 非失败/finalUrl/向后兼容) ✓
- 工具 16：注册 T15/T1；请求构建 T14；cURL 导入 T7/T8；导出 T9；env-resolve T5；query T6；集合树 T10；多环境 T10；历史 T10;编辑模型 T14;响应面板 T14;Web 错误标注 T12/T14;深链 T13;快捷键 T14;导入导出 T11;存储写失败 T4/T10 ✓
- **占位符扫描**：Task7 `decodeAnsi` 与 cmd 分支标注「实现时完整 + golden 覆盖」并给出边界返回码,属实现细节非空占位(有测试断言锚定行为)。
- **类型一致**：`NetFetchOk`/`NetFetchError`/`RequestModel`/`Env`/`HistoryEntry`/`sendRequest`/`resolveVars`/`parseQuery`/`serializeQuery`/`parseCurl`/`buildCurl`/`storageSetChecked`/`writeDeepLink`/`readDeepLink`/`useRestStore` 跨任务签名一致。

**Open Questions(不阻塞,实现期定)**：cURL 多 `-b` 合并策略(暂定最后一个胜出)；历史截断后重发来源(集合项保留全量,纯历史用截断模板+提示)；query 与 URL 文本双向同步防抖粒度。
