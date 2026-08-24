# ToolKit 基座(toolbox-foundation)Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立 ToolKit 的「一套代码双输出」基座:应用壳 + ToolDescriptor 契约 + JSON 工具黄金模板 + 双通道构建与 CI,证明扩展机制与双端一致性。

**Architecture:** electron-vite 三进程(main/preload/renderer),renderer 环境无关(禁 import electron),工具核心为纯同步 transform 函数,UI 经 Comlink Web Worker 统一调用;注册表驱动路由与导航;daisyUI 5 三主题经 `data-theme` 切换。

**Tech Stack:** React 18 + TypeScript 5 + electron-vite 2 + Electron 33 + electron-builder 25 + Tailwind 4 + daisyUI 5 + zustand 5 + react-router-dom 7(HashRouter) + Comlink 4 + Vitest 2 + Playwright + pnpm

## Global Constraints

- Node 20+;pnpm;`.npmrc` 含 `node-linker=hoisted`
- **Tailwind 4 + daisyUI 5,CSS-first 配置,禁止 tailwind.config.js**;主题:`toolkit-dark`(默认)/`toolkit-paper`/`toolkit-caramel`,色值见 Task 4(全局唯一来源)
- **HashRouter**;renderer 目录(`src/renderer/**`)**禁止 `import electron`**(ESLint no-restricted-imports 强制)
- Electron:`contextIsolation: true`、`nodeIntegration: false`、preload 仅 contextBridge 白名单 `toolkitAPI`;index.html 含 CSP meta
- 三态 OK/ERROR/EMPTY,无静默失败;粘贴即出(防抖 150ms);1MB transform+格式化 <200ms;输入 >200KB 折叠;输出虚拟滚动 + 逐行着色
- 键盘流:Ctrl+K 工具面板、Ctrl+Shift+C 复制、进工具页焦点自动落输入区
- 中文 UI;等宽标注最小 11px;`prefers-reduced-motion` 降级电流动效
- 信号色(daisyUI 语义槽 error/warning/success):dark `#E30613/#FFB300/#00A651`、paper `#C50A10/#B07500/#007A3D`(lamp 填充可 `#FFB300`)、caramel `#E8353D/#FFB300/#2FBF71`;激活线:dark `#F4F1EA`、paper `#1A1917`、caramel `#F2E6D4`
- CI:ubuntu 跑 lint/test,win+mac matrix 构建桌面;mac 设 `CSC_IDENTITY_AUTO_DISCOVERY=false`(ad-hoc);Playwright 首页 smoke;在线版 GitHub Pages;检查更新 = Releases API 比对 + 引导
- 每个 Task 结束 `git commit`;测试先红后绿(TDD);LICENSE = MIT

---

### Task 1: 仓库初始化与 electron-vite 脚手架

**Files:**
- Create: `.gitignore`, `.npmrc`, `LICENSE`, `README.md`, `package.json`, `tsconfig.json`, `tsconfig.node.json`, `electron.vite.config.ts`, `eslint.config.js`, `vitest.config.ts`
- Create: `electron/main.ts`, `electron/preload.ts`
- Create: `src/renderer/index.html`, `src/renderer/src/main.tsx`, `src/renderer/src/App.tsx`, `src/renderer/src/assets/main.css`

**Interfaces:**
- Produces: 可运行的空应用(浏览器 + Electron 双通道 dev);npm scripts:`dev`(=electron-vite dev)、`dev:web`(仅 renderer)、`build:web`、`build:desktop`、`lint`、`test`
- Produces: `src/renderer/src/assets/main.css` 中三主题 CSS 变量(Task 4 依赖);`electron/main.ts` 的安全 webPreferences(Task 12 校验)

- [ ] **Step 1: git init 与基础文件**

```bash
cd /d/a-tool-kit
git init -b main
```

`.gitignore`:
```
node_modules/
out/
dist/
release/
*.local
```

`.npmrc`:
```
node-linker=hoisted
```

`LICENSE`: MIT 全文(版权行 `Copyright (c) 2026 ToolKit`)。

`README.md`:
```markdown
# ToolKit

本地优先的中文开发者工具箱:一套代码,双输出(Electron 桌面 + 静态 Web)。10 个高频工具,粘贴即出结果。

## 开发
pnpm install
pnpm dev        # Electron 壳 + 浏览器 HMR
pnpm dev:web    # 仅浏览器
pnpm test       # Vitest(golden)
pnpm build:web  # 静态产物(out/renderer → dist/web)
pnpm build:desktop  # Win/Mac 安装包(未签名,见「首次运行」)
```

初始提交(含既有文档):
```bash
git add .gitignore .npmrc LICENSE README.md project-docs/ openspec/ PRODUCT.md
git commit -m "chore: init repo with design docs and openspec change"
```

- [ ] **Step 2: package.json(版本锁定)**

```json
{
  "name": "toolkit",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "electron-vite dev",
    "dev:web": "vite --config vite.web.config.ts",
    "lint": "eslint .",
    "test": "vitest run",
    "build:web": "electron-vite build && node scripts/copy-web.mjs",
    "build:desktop": "electron-vite build && electron-builder --config electron-builder.yml",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "comlink": "^4.4.0",
    "framer-motion": "^11.11.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^7.1.0",
    "zustand": "^5.0.2"
  },
  "devDependencies": {
    "@playwright/test": "^1.49.0",
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.3",
    "daisyui": "^5.0.0",
    "electron": "^33.2.0",
    "electron-builder": "^25.1.8",
    "electron-vite": "^2.3.0",
    "eslint": "^9.15.0",
    "tailwindcss": "^4.0.0",
    "typescript": "^5.6.3",
    "typescript-eslint": "^8.15.0",
    "vite": "^6.0.0",
    "vitest": "^2.1.5"
  }
}
```

```bash
pnpm install
```

- [ ] **Step 3: TS 与构建配置**

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022", "module": "ESNext", "moduleResolution": "bundler",
    "strict": true, "jsx": "react-jsx", "skipLibCheck": true,
    "types": ["vite/client"], "noEmit": true,
    "baseUrl": ".", "paths": { "@/*": ["src/renderer/src/*"] }
  },
  "include": ["src/renderer", "test", "electron"]
}
```

`electron.vite.config.ts`:
```ts
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

export default defineConfig({
  main: { plugins: [externalizeDepsPlugin()] },
  preload: { plugins: [externalizeDepsPlugin()] },
  renderer: {
    plugins: [react()],
    resolve: { alias: { '@': resolve('src/renderer/src') } }
  }
})
```

`vite.web.config.ts`(纯浏览器 dev,同源 renderer):
```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
export default defineConfig({
  root: 'src/renderer',
  plugins: [react()],
  base: './',
  resolve: { alias: { '@': resolve('src/renderer/src') } },
  build: { outDir: '../../dist/web', emptyOutDir: true }
})
```

`scripts/copy-web.mjs`:
```js
import { cpSync } from 'node:fs'
cpSync('out/renderer', 'dist/web', { recursive: true })
console.log('web build copied to dist/web')
```

`vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'
export default defineConfig({
  resolve: { alias: { '@': resolve('src/renderer/src') } },
  test: { environment: 'node', include: ['test/**/*.test.ts'] }
})
```

- [ ] **Step 4: Electron 三进程最小实现**

`electron/main.ts`:
```ts
import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'node:path'
import { releasesUrl, latestReleaseApi } from './update'

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280, height: 800, minWidth: 1024, minHeight: 640,
    title: 'ToolKit',
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      contextIsolation: true, nodeIntegration: false, sandbox: false
    }
  })
  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url); return { action: 'deny' }
  })
  if (process.env.ELECTRON_RENDERER_URL) {
    void win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    void win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

ipcMain.handle('check-update', async () => latestReleaseApi())
ipcMain.handle('open-releases', () => { void shell.openExternal(releasesUrl) })

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
```

`electron/update.ts`:
```ts
export const releasesUrl = 'https://github.com/<owner>/toolkit/releases'
const REPO_API = 'https://api.github.com/repos/<owner>/toolkit/releases/latest'
export interface ReleaseInfo { tag_name: string; html_url: string }
export async function latestReleaseApi(): Promise<ReleaseInfo | null> {
  try {
    const res = await fetch(REPO_API, { headers: { 'User-Agent': 'toolkit' } })
    if (!res.ok) return null
    return (await res.json()) as ReleaseInfo
  } catch { return null }
}
```
(实现期把 `<owner>` 替换为实际 GitHub owner;查无仓库时功能静默降级返回 null。)

`electron/preload.ts`:
```ts
import { contextBridge, ipcRenderer } from 'electron'
contextBridge.exposeInMainWorld('toolkitAPI', {
  openExternal: (url: string) => ipcRenderer.invoke('open-releases', url),
  checkUpdate: () => ipcRenderer.invoke('check-update')
})
```

`src/renderer/index.html`:
```html
<!doctype html>
<html lang="zh-CN" data-theme="toolkit-dark">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy"
        content="default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://api.github.com" />
  <title>ToolKit</title>
  <script>
    // 首帧主题注入:先于 React,防 FOUC(存储键与 core/storage.ts 约定一致)
    try {
      var raw = localStorage.getItem('toolkit.settings')
      var t = raw ? (JSON.parse(raw).state || {}).theme : null
      if (t) document.documentElement.dataset.theme = t
    } catch (e) {}
  </script>
</head>
<body class="bg-base-100 text-base-content">
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>
```

`src/renderer/src/main.tsx`:
```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import './assets/main.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><App /></React.StrictMode>
)
```

`src/renderer/src/App.tsx`(占位,Task 3 替换):
```tsx
export function App(): JSX.Element {
  return <div className="p-8 font-sans">ToolKit 基座启动中…</div>
}
```

- [ ] **Step 5: Tailwind 4 + daisyUI 5 三主题(CSS-first,全局唯一色值来源)**

`src/renderer/src/assets/main.css`:
```css
@import "tailwindcss";
@plugin "daisyui" { themes: false; }

@plugin "daisyui/theme" {
  name: "toolkit-dark"; default: true; color-scheme: dark;
  --color-base-100: #0A0A0A; --color-base-200: #111214; --color-base-300: #2A2C30;
  --color-base-content: #F4F1EA;
  --color-primary: #F4F1EA; --color-primary-content: #0A0A0A;
  --color-error: #E30613; --color-error-content: #F4F1EA;
  --color-warning: #FFB300; --color-warning-content: #0A0A0A;
  --color-success: #00A651; --color-success-content: #F4F1EA;
  --color-neutral: #8A8D93; --font-mono: "JetBrains Mono", "Cascadia Code", Consolas, monospace;
  --font-sans: "MiSans", "HarmonyOS Sans SC", "Microsoft YaHei UI", "PingFang SC", sans-serif;
}
@plugin "daisyui/theme" {
  name: "toolkit-paper"; color-scheme: light;
  --color-base-100: #F4F1EA; --color-base-200: #FFFFFF; --color-base-300: #D8D3C4;
  --color-base-content: #1A1917;
  --color-primary: #1A1917; --color-primary-content: #F4F1EA;
  --color-error: #C50A10; --color-error-content: #F4F1EA;
  --color-warning: #B07500; --color-warning-content: #F4F1EA;
  --color-success: #007A3D; --color-success-content: #F4F1EA;
  --color-neutral: #6B6E74; --font-mono: "JetBrains Mono", "Cascadia Code", Consolas, monospace;
  --font-sans: "MiSans", "HarmonyOS Sans SC", "Microsoft YaHei UI", "PingFang SC", sans-serif;
}
@plugin "daisyui/theme" {
  name: "toolkit-caramel"; color-scheme: dark;
  --color-base-100: #2B1F14; --color-base-200: #33261A; --color-base-300: #4A3826;
  --color-base-content: #F2E6D4;
  --color-primary: #F2E6D4; --color-primary-content: #2B1F14;
  --color-error: #E8353D; --color-error-content: #F2E6D4;
  --color-warning: #FFB300; --color-warning-content: #2B1F14;
  --color-success: #2FBF71; --color-success-content: #2B1F14;
  --color-neutral: #A08B6E; --font-mono: "JetBrains Mono", "Cascadia Code", Consolas, monospace;
  --font-sans: "MiSans", "HarmonyOS Sans SC", "Microsoft YaHei UI", "PingFang SC", sans-serif;
}

/* 线路图世界基元:32px 模块网格 */
.circuit-grid {
  background-image:
    linear-gradient(var(--color-base-300) 1px, transparent 1px),
    linear-gradient(90deg, var(--color-base-300) 1px, transparent 1px);
  background-size: 32px 32px;
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
}
```

- [ ] **Step 6: ESLint(renderer 禁 electron 规则)+ 验证双通道 dev**

`eslint.config.js`:
```js
import tseslint from 'typescript-eslint'
export default tseslint.config(
  ...tseslint.configs.recommended,
  {
    files: ['src/renderer/**'],
    rules: {
      'no-restricted-imports': ['error', { paths: [{ name: 'electron', message: 'renderer 环境无关:用 window.toolkitAPI 适配器' }] }]
    }
  }
)
```

```bash
pnpm lint && pnpm typecheck
pnpm dev:web   # 浏览器打开 http://localhost:5173 显示「ToolKit 基座启动中…」
pnpm dev       # Electron 窗口打开同一页面(手动验证后 Ctrl+C)
```

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: electron-vite scaffold with TW4+daisyUI5 tri-theme, security defaults, web channel"
```

---

### Task 2: 类型契约(ToolDescriptor / ToolResult / Transform)

**Files:**
- Create: `src/renderer/src/core/types.ts`, `src/renderer/src/core/transform.ts`
- Test: `test/types.test.ts`

**Interfaces:**
- Produces: `ToolCapability`、`ToolDescriptor`、`ToolResult<T>`、`Transform<I, O, Opts>`(后续所有任务引用,签名以本任务为准)

- [ ] **Step 1: 写失败测试(类型负向 + 判别联合)**

`test/types.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import type { ToolResult, ToolDescriptor } from '@core/types'

describe('ToolResult 判别联合', () => {
  it('ok 携带 data', () => {
    const r: ToolResult<string> = { status: 'ok', data: 'x' }
    expect(r.status).toBe('ok')
  })
  it('invalid-input 携带位置', () => {
    const r: ToolResult<never> = { status: 'error', kind: 'invalid-input', message: '非法字符', position: 12 }
    expect(r.kind).toBe('invalid-input')
  })
  it('partial 携带失败项', () => {
    const r: ToolResult<string[]> = { status: 'error', kind: 'partial', message: '部分失败', failedItems: [3, 7] }
    expect(r.failedItems).toEqual([3, 7])
  })
  it('unsupported 携带结构名', () => {
    const r: ToolResult<never> = { status: 'error', kind: 'unsupported', structure: '合并单元格', message: '不支持' }
    expect(r.structure).toBe('合并单元格')
  })
})

// @ts-expect-error 缺 capability 必须编译期失败
const bad: ToolDescriptor = { id: 'x', name: 'X', route: '/tools/x' }
void bad
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm vitest run test/types.test.ts`
Expected: FAIL(模块 `@core/types` 不存在)

- [ ] **Step 3: 最小实现**

`src/renderer/src/core/types.ts`:
```ts
import type { ComponentType, LazyExoticComponent } from 'react'

export interface ToolCapability {
  offline: boolean
  network?: false | 'search' | 'ai'
  async?: boolean
}

export interface ToolDescriptor {
  id: string
  name: string
  icon: ComponentType
  route: string
  component: LazyExoticComponent<ComponentType>
  capability: ToolCapability
}

export type ToolResult<T> =
  | { status: 'ok'; data: T }
  | { status: 'error'; kind: 'invalid-input'; message: string; position?: number }
  | { status: 'error'; kind: 'partial'; message: string; failedItems?: number[] }
  | { status: 'error'; kind: 'unsupported'; structure: string; message: string }

export interface TransformOpts { [key: string]: string | number | boolean }

export type Transform<I, O, Opts extends TransformOpts = TransformOpts> =
  (input: I, opts?: Opts) => ToolResult<O>
```

`src/renderer/src/core/transform.ts`:
```ts
export type { Transform, TransformOpts, ToolResult } from './types'
```

- [ ] **Step 4: 跑测试与类型检查通过**

Run: `pnpm vitest run test/types.test.ts && pnpm typecheck`
Expected: PASS(@ts-expect-error 生效 = 缺字段确被拒绝)

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/core test/types.test.ts
git commit -m "feat: ToolDescriptor/ToolResult/Transform type contract with negative type test"
```

---

### Task 3: 注册表 + HashRouter 路由 + 空注册表引导页

**Files:**
- Create: `src/renderer/src/tools/register.ts`, `src/renderer/src/app/routes.tsx`, `src/renderer/src/pages/Home.tsx`
- Modify: `src/renderer/src/App.tsx`(替换占位)
- Test: `test/register.test.ts`

**Interfaces:**
- Consumes: `ToolDescriptor`(Task 2)
- Produces: `tools: ToolDescriptor[]`(导出自 `@tools/register`;Task 10 注册 JSON 工具时追加一行);`searchTools(query): ToolDescriptor[]`(Task 6 复用);路由 `/`(首页)与 `/:toolRoute*`

- [ ] **Step 1: 失败测试**

`test/register.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { tools, searchTools } from '@tools/register'

describe('注册表', () => {
  it('初始为空数组(合法状态)', () => {
    expect(Array.isArray(tools)).toBe(true)
  })
  it('searchTools 空 query 返回全部', () => {
    expect(searchTools('')).toEqual(tools)
  })
})
```

Run: `pnpm vitest run test/register.test.ts` → FAIL(模块不存在)

- [ ] **Step 2: 实现**

`src/renderer/src/tools/register.ts`:
```ts
import type { ToolDescriptor } from '@core/types'

// 加一个工具 = 在此数组追加一行(实现接口 + 目录),导航/路由自动生效
export const tools: ToolDescriptor[] = []

export function searchTools(query: string): ToolDescriptor[] {
  const q = query.trim().toLowerCase()
  if (!q) return tools
  return tools.filter((t) => t.id.includes(q) || t.name.toLowerCase().includes(q))
}
```

`src/renderer/src/app/routes.tsx`:
```tsx
import { createHashRouter, Navigate } from 'react-router-dom'
import { Home } from '@pages/Home'
import { tools } from '@tools/register'

export const router = createHashRouter([
  { path: '/', element: <Home /> },
  ...tools.map((t) => ({ path: t.route.replace(/^\//, ''), element: <t.component /> })),
  { path: '*', element: <Navigate to="/" replace /> }
])
```

`src/renderer/src/pages/Home.tsx`(引导页,Task 6 升级为总览):
```tsx
export function Home(): JSX.Element {
  return (
    <main className="circuit-grid flex h-full items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold">ToolKit</h1>
        <p className="mt-2 text-sm text-neutral">工具尚未接入——注册后此处成为总览</p>
      </div>
    </main>
  )
}
```

`src/renderer/src/App.tsx`(替换):
```tsx
import { RouterProvider } from 'react-router-dom'
import { router } from './app/routes'
export function App(): JSX.Element {
  return <RouterProvider router={router} />
}
```

- [ ] **Step 3: 验证(测试 + 双通道页面可达)**

Run: `pnpm vitest run test/register.test.ts && pnpm typecheck && pnpm lint`
Expected: PASS

```bash
pnpm dev:web  # 浏览器 http://localhost:5173/#/ 显示引导页;URL 手动改 #/tools/x 回落首页
```

- [ ] **Step 4: Commit**

```bash
git add src/renderer/src test/register.test.ts
git commit -m "feat: registry-driven HashRouter with empty-registry guide home"
```

---

### Task 4: 存储单一出口 + 主题 store + 首帧注入联通

**Files:**
- Create: `src/renderer/src/core/storage.ts`, `src/renderer/src/core/theme-store.ts`
- Test: `test/storage.test.ts`

**Interfaces:**
- Consumes: Task 1 的 `index.html` 内联脚本(存储键 `toolkit.settings`,zustand persist 包一层 `{ state: { theme } }`)
- Produces: `storageGet<T>(key, fallback): T`、`storageSet(key, value): void`;`useThemeStore`(state: `theme: ThemeName`,actions: `setTheme`)、`ThemeName = 'toolkit-dark' | 'toolkit-paper' | 'toolkit-caramel'`;常量 `STORAGE_KEYS = { settings: 'toolkit.settings' }`(Task 6 最近使用复用 storage;Task 7 主题色卡复用 useThemeStore)

- [ ] **Step 1: 失败测试**

`test/storage.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { storageGet, storageSet } from '@core/storage'

describe('storage 单一出口', () => {
  beforeEach(() => localStorage.clear())
  it('set 后 get 返回同值', () => {
    storageSet('k', { a: 1 })
    expect(storageGet('k', null)).toEqual({ a: 1 })
  })
  it('缺键返回 fallback', () => {
    expect(storageGet('missing', 'fb')).toBe('fb')
  })
})
```

Run: `pnpm vitest run test/storage.test.ts` → FAIL
注意:node 环境无 localStorage——在 `vitest.config.ts` 的 test 加 `env: { }` 之外,用 stub:
`vitest.config.ts` test 块追加:
```ts
setupFiles: ['test/setup.ts']
```
`test/setup.ts`:
```ts
import { vi } from 'vitest'
const store = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear()
})
```

- [ ] **Step 2: 实现**

`src/renderer/src/core/storage.ts`:
```ts
// 一切持久化的单一出口(renderer 内禁止直接调 localStorage)
export const STORAGE_KEYS = { settings: 'toolkit.settings' } as const

export function storageGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}

export function storageSet(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* 存储满等异常静默,不影响功能 */ }
}
```

`src/renderer/src/core/theme-store.ts`:
```ts
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { storageGet, storageSet, STORAGE_KEYS } from './storage'

export type ThemeName = 'toolkit-dark' | 'toolkit-paper' | 'toolkit-caramel'

interface ThemeState { theme: ThemeName; setTheme: (t: ThemeName) => void }

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'toolkit-dark',
      setTheme: (theme) => {
        document.documentElement.dataset.theme = theme
        set({ theme })
      }
    }),
    {
      name: STORAGE_KEYS.settings,
      storage: createJSONStorage(() => ({
        getItem: (k) => storageGet<string | null>(k, null),
        setItem: (k, v) => storageSet(k, v),
        removeItem: (k) => localStorage.removeItem(k)
      }))
    }
  )
)
```

- [ ] **Step 3: 联通验证**

Run: `pnpm vitest run test/storage.test.ts && pnpm typecheck`
Expected: PASS

```bash
pnpm dev:web
# 浏览器控制台执行:
#   const {useThemeStore}=await import('/src/core/theme-store.ts')
#   useThemeStore.getState().setTheme('toolkit-caramel')
# 页面立即变焦糖底;刷新后仍是焦糖(内联脚本读到 toolkit.settings)
```

- [ ] **Step 4: Commit**

```bash
git add src/renderer/src/core test/storage.test.ts test/setup.ts vitest.config.ts
git commit -m "feat: single-outlet storage + persisted theme store wired to first-frame injection"
```

---

### Task 5: 应用壳(线路图节点导航 + 激活亮白线 + 联网徽标 + 窄窗折叠)

**Files:**
- Create: `src/renderer/src/app/AppShell.tsx`, `src/renderer/src/app/NavLink.tsx`
- Modify: `src/renderer/src/app/routes.tsx`(首页与工具页共用壳)
- Test: `test/appshell.test.tsx`

**Interfaces:**
- Consumes: `tools`(Task 3)、`ToolDescriptor.capability`
- Produces: `AppShell`(布局容器,Task 6/7/10 的页面都在其 `<Outlet/>` 内渲染);`NavLink` 节点样式(激活=primary 色亮线+发光,非语义色)

- [ ] **Step 1: 失败测试(渲染冒烟)**

`test/appshell.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AppShell } from '@app/AppShell'

describe('AppShell', () => {
  it('空注册表渲染品牌与设置入口', () => {
    const { getByText } = render(
      <MemoryRouter><AppShell /></MemoryRouter>
    )
    expect(getByText('ToolKit')).toBeTruthy()
    expect(getByText('设置')).toBeTruthy()
  })
})
```
需 dev 依赖:`pnpm add -D @testing-library/react jsdom`,并把 `vitest.config.ts` 的该用例环境改为 jsdom(`test.environmentMatchGlobs` 或在文件头 `// @vitest-environment jsdom`)。

Run: `pnpm vitest run test/appshell.test.tsx` → FAIL

- [ ] **Step 2: 实现**

`src/renderer/src/app/NavLink.tsx`:
```tsx
import { Link, useLocation } from 'react-router-dom'
import type { ToolDescriptor } from '@core/types'

export function ToolNavLink({ tool }: { tool: ToolDescriptor }): JSX.Element {
  const active = useLocation().hash.slice(1) === tool.route ||
    useLocation().pathname === tool.route
  return (
    <Link
      to={tool.route}
      className={`relative flex items-center gap-2.5 px-5 py-2.5 text-sm
        ${active ? 'text-base-content' : 'text-neutral hover:text-base-content'}`}
      aria-current={active ? 'page' : undefined}
    >
      <span
        className={`h-2 w-2 border-1.5 ${active
          ? 'border-primary bg-primary shadow-[0_0_8px_var(--color-primary)]'
          : 'border-neutral bg-base-100'}`}
      />
      <span className="whitespace-nowrap">{tool.name}</span>
      {tool.capability.network ? (
        <span className="badge badge-xs badge-warning ml-auto font-mono text-[11px]">NET</span>
      ) : null}
      {active && (
        <span className="absolute left-[23px] top-full h-[calc(100%-0px)] w-0.5 bg-primary
          shadow-[0_0_6px_var(--color-primary)]" aria-hidden />
      )}
    </Link>
  )
}
```
(注:`border-1.5` 若 TW4 无此原子类,用 `border` + `style={{ borderWidth: 1.5 }}`;发光严格限「电流到达灯泡」语义。)

`src/renderer/src/app/AppShell.tsx`:
```tsx
import { Outlet, Link } from 'react-router-dom'
import { tools } from '@tools/register'
import { ToolNavLink } from './NavLink'

export function AppShell(): JSX.Element {
  return (
    <div className="grid h-screen grid-cols-[15rem_1fr] max-lg:grid-cols-[3.5rem_1fr]">
      <nav className="circuit-grid flex flex-col border-r border-base-300 bg-base-100/90 py-5">
        <Link to="/" className="px-5 pb-4 text-xl font-bold tracking-widest">
          ToolKit
          <span className="mt-0.5 block font-mono text-[11px] font-normal tracking-[0.3em] text-neutral">
            DEVELOPER TOOLBOX
          </span>
        </Link>
        <div className="flex-1 overflow-y-auto">
          {tools.length === 0 && (
            <p className="px-5 py-3 text-sm text-neutral">待接入…</p>
          )}
          {tools.map((t) => <ToolNavLink key={t.id} tool={t} />)}
        </div>
        <Link to="/settings" className="flex justify-between border-t border-base-300 px-5 pt-3 text-sm text-neutral">
          <span>设置</span>
          <span className="font-mono text-[11px] tracking-widest">THEME</span>
        </Link>
      </nav>
      <main className="circuit-grid min-w-0 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
```

`routes.tsx` 改为壳包裹:
```tsx
export const router = createHashRouter([
  {
    element: <AppShell />,
    children: [
      { path: '/', element: <Home /> },
      ...tools.map((t) => ({ path: t.route.replace(/^\//, ''), element: <t.component /> })),
      { path: '*', element: <Navigate to="/" replace /> }
    ]
  }
])
```

- [ ] **Step 3: 验证**

Run: `pnpm vitest run test/appshell.test.tsx && pnpm typecheck && pnpm lint`
Expected: PASS

```bash
pnpm dev:web  # 导航壳可见;窗口缩到 <1024px 导航折叠为窄栏(图标隐藏文字由 max-lg 类实现,文字加 max-lg:hidden)
```
(实现时给 `ToolNavLink` 的文字 span 加 `max-lg:hidden`、徽标加 `max-lg:hidden`。)

- [ ] **Step 4: Commit**

```bash
git add src/renderer/src/app test/appshell.test.tsx
git commit -m "feat: circuit-node app shell with lit active line, NET badge, narrow-window rail"
```

---

### Task 6: 首页总览(节点图 + 搜索 + 最近使用)+ Ctrl+K 面板

**Files:**
- Create: `src/renderer/src/pages/Home.tsx`(替换)、`src/renderer/src/app/CommandPalette.tsx`, `src/renderer/src/core/recent.ts`
- Test: `test/recent.test.ts`

**Interfaces:**
- Consumes: `searchTools`(Task 3)、`storageGet/storageSet`(Task 4)
- Produces: `pushRecent(toolId): void`、`getRecent(): string[]`(最近使用,最多 5 条);`CommandPalette`(全局挂载,监听 Ctrl+K);首页为启动第一屏(路由 `/`)

- [ ] **Step 1: 失败测试**

`test/recent.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { pushRecent, getRecent } from '@core/recent'

describe('最近使用', () => {
  beforeEach(() => localStorage.clear())
  it('推入并去重置顶,最多 5 条', () => {
    for (const id of ['a', 'b', 'a', 'c', 'd', 'e', 'f']) pushRecent(id)
    expect(getRecent()).toEqual(['f', 'e', 'd', 'c', 'b'])
  })
})
```

Run: `pnpm vitest run test/recent.test.ts` → FAIL

- [ ] **Step 2: 实现**

`src/renderer/src/core/recent.ts`:
```ts
import { storageGet, storageSet, STORAGE_KEYS } from './storage'
import { tools } from '@tools/register'

const KEY = STORAGE_KEYS.settings + '.recent'
const MAX = 5

export function getRecent(): string[] {
  return storageGet<string[]>(KEY, []).filter((id) => tools.some((t) => t.id === id))
}

export function pushRecent(toolId: string): void {
  const next = [toolId, ...getRecent().filter((id) => id !== toolId)].slice(0, MAX)
  storageSet(KEY, next)
}
```

`CommandPalette.tsx`(输入过滤 + 上下键 + 回车跳转):
```tsx
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { searchTools } from '@tools/register'

export function CommandPalette(): JSX.Element | null {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [idx, setIdx] = useState(0)
  const nav = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault(); setOpen((v) => !v); setQ(''); setIdx(0)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => { if (open) inputRef.current?.focus() }, [open])

  if (!open) return null
  const hits = searchTools(q)
  const go = (route: string): void => { setOpen(false); nav(route) }

  return (
    <dialog className="modal modal-open" onClick={() => setOpen(false)}>
      <div className="modal-box bg-base-200" onClick={(e) => e.stopPropagation()}>
        <input ref={inputRef} className="input input-bordered w-full font-mono text-sm"
          placeholder="搜索工具(id 或名称)…" value={q}
          onChange={(e) => { setQ(e.target.value); setIdx(0) }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') setIdx((i) => Math.min(i + 1, hits.length - 1))
            if (e.key === 'ArrowUp') setIdx((i) => Math.max(i - 1, 0))
            if (e.key === 'Enter' && hits[idx]) go(hits[idx].route)
          }} />
        <ul className="menu mt-2">
          {hits.map((t, i) => (
            <li key={t.id}><button className={i === idx ? 'active' : ''} onClick={() => go(t.route)}>
              {t.name}<span className="ml-auto font-mono text-[11px] text-neutral">{t.id}</span>
            </button></li>
          ))}
          {hits.length === 0 && <li className="p-3 text-sm text-neutral">无匹配工具</li>}
        </ul>
      </div>
    </dialog>
  )
}
```
(在 `AppShell` 根 div 内追加 `<CommandPalette />`。)

`Home.tsx`(替换为总览:节点图 + 搜索 + 最近):
```tsx
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { searchTools, tools } from '@tools/register'
import { getRecent } from '@core/recent'

export function Home(): JSX.Element {
  const [q, setQ] = useState('')
  const nav = useNavigate()
  const hits = useMemo(() => searchTools(q), [q])
  const recent = getRecent().map((id) => tools.find((t) => t.id === id)!).filter(Boolean)

  return (
    <div className="mx-auto max-w-4xl p-8">
      <input autoFocus className="input input-bordered w-full font-mono text-sm"
        placeholder="搜索工具,回车进入第一个结果…(Ctrl+K 全局)"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && hits[0]) nav(hits[0].route) }} />
      {recent.length > 0 && (
        <section className="mt-8">
          <h2 className="font-mono text-[11px] tracking-[0.3em] text-neutral">RECENT · 最近使用</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {recent.map((t) => (
              <Link key={t.id} to={t.route} className="btn btn-sm btn-outline">{t.name}</Link>
            ))}
          </div>
        </section>
      )}
      <section className="mt-8">
        <h2 className="font-mono text-[11px] tracking-[0.3em] text-neutral">TOOLS · 工具节点图</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3">
          {hits.map((t) => (
            <Link key={t.id} to={t.route}
              className="circuit-grid border border-base-300 bg-base-200/60 p-4 transition hover:border-primary">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 border-1.5 border-neutral bg-base-100" />
                <span className="text-sm">{t.name}</span>
                {t.capability.network && <span className="badge badge-xs badge-warning font-mono text-[11px]">NET</span>}
              </div>
              <span className="mt-1 block font-mono text-[11px] text-neutral">{t.id}</span>
            </Link>
          ))}
          {tools.length === 0 && (
            <p className="text-sm text-neutral">工具尚未接入——注册后此处成为节点图</p>
          )}
        </div>
      </section>
    </div>
  )
}
```
(进入工具页时调用 `pushRecent`:在 `AppShell` 里 `useLocation` 变化且匹配到 tool 时入列。)

- [ ] **Step 3: 验证**

Run: `pnpm vitest run test/recent.test.ts && pnpm typecheck && pnpm lint`
Expected: PASS

```bash
pnpm dev:web  # 首页=总览;Ctrl+K 弹面板;搜索"jso"回车(Task 10 注册后生效,当前无匹配提示正常)
```

- [ ] **Step 4: Commit**

```bash
git add src/renderer/src test/recent.test.ts
git commit -m "feat: overview home with node map, search, recent; Ctrl+K command palette"
```

---

### Task 7: 设置页(主题色卡 + 关于/版本 + 检查更新)

**Files:**
- Create: `src/renderer/src/pages/Settings.tsx`, `src/renderer/src/core/check-update.ts`
- Test: `test/check-update.test.ts`

**Interfaces:**
- Consumes: `useThemeStore`(Task 4)、`window.toolkitAPI`(Task 1 preload,Web 下为 undefined)
- Produces: `checkUpdate(): Promise<{ current: string; latest: string | null; updateUrl: string }>`(版本比对;桌面经 ipc,Web 直接 fetch;失败 latest=null 静默降级);路由 `settings`

- [ ] **Step 1: 失败测试**

`test/check-update.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { compareSemver } from '@core/check-update'

describe('semver 比对', () => {
  it('识别新版可用', () => {
    expect(compareSemver('0.1.0', 'v0.2.0')).toBe('newer')
  })
  it('相同版本', () => {
    expect(compareSemver('0.1.0', 'v0.1.0')).toBe('same')
  })
  it('无最新信息', () => {
    expect(compareSemver('0.1.0', null)).toBe('unknown')
  })
})
```

Run: `pnpm vitest run test/check-update.test.ts` → FAIL

- [ ] **Step 2: 实现**

`src/renderer/src/core/check-update.ts`:
```ts
export const APP_VERSION = '0.1.0' // 与 package.json 同步(构建期可改 vite define 注入)
export const RELEASES_URL = 'https://github.com/<owner>/toolkit/releases'
const API = 'https://api.github.com/repos/<owner>/toolkit/releases/latest'

export type UpdateVerdict = 'newer' | 'same' | 'older' | 'unknown'

export function compareSemver(current: string, latest: string | null): UpdateVerdict {
  if (!latest) return 'unknown'
  const c = current.replace(/^v/, '').split('.').map(Number)
  const l = latest.replace(/^v/, '').split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    if (l[i] > c[i]) return 'newer'
    if (l[i] < c[i]) return 'older'
  }
  return 'same'
}

interface TkAPI { checkUpdate(): Promise<{ tag_name: string } | null>; openExternal(url: string): void }

export async function checkUpdate(): Promise<{ current: string; latest: string | null; verdict: UpdateVerdict }> {
  const api = (window as { toolkitAPI?: TkAPI }).toolkitAPI
  let tag: string | null = null
  try {
    if (api) tag = (await api.checkUpdate())?.tag_name ?? null
    else tag = (await (await fetch(API, { headers: { 'User-Agent': 'toolkit' } })).json())?.tag_name ?? null
  } catch { tag = null }
  return { current: APP_VERSION, latest: tag, verdict: compareSemver(APP_VERSION, tag) }
}

export function openReleases(): void {
  const api = (window as { toolkitAPI?: TkAPI }).toolkitAPI
  if (api) api.openExternal(RELEASES_URL)
  else window.open(RELEASES_URL, '_blank')
}
```

`src/renderer/src/pages/Settings.tsx`:
(路由接线:在 `app/routes.tsx` 的 children 中追加 `{ path: 'settings', lazy: () => import('@pages/Settings') }`。)
```tsx
import { useState } from 'react'
import { useThemeStore, type ThemeName } from '@core/theme-store'
import { checkUpdate, openReleases, APP_VERSION } from '@core/check-update'

const THEMES: { id: ThemeName; label: string; swatch: string[] }[] = [
  { id: 'toolkit-dark', label: '深色(平黑)', swatch: ['#0A0A0A', '#F4F1EA', '#E30613'] },
  { id: 'toolkit-paper', label: '纸白', swatch: ['#F4F1EA', '#1A1917', '#C50A10'] },
  { id: 'toolkit-caramel', label: '焦糖', swatch: ['#2B1F14', '#FFB300', '#F2E6D4'] }
]

export function Settings(): JSX.Element {
  const { theme, setTheme } = useThemeStore()
  const [upd, setUpd] = useState<string | null>(null)

  return (
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-bold">设置</h1>
      <section className="mt-6">
        <h2 className="font-mono text-[11px] tracking-[0.3em] text-neutral">THEME · 主题</h2>
        <div className="mt-3 grid grid-cols-3 gap-3">
          {THEMES.map((t) => (
            <button key={t.id} onClick={() => setTheme(t.id)}
              className={`border p-3 text-left text-sm ${theme === t.id ? 'border-primary' : 'border-base-300'}`}>
              <span className="flex gap-1">
                {t.swatch.map((c) => <span key={c} className="h-4 w-4" style={{ background: c }} />)}
              </span>
              <span className="mt-2 block">{t.label}</span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-neutral">自定义主题(v0.2):修改 daisyUI 主题变量集</p>
      </section>
      <section className="mt-8">
        <h2 className="font-mono text-[11px] tracking-[0.3em] text-neutral">ABOUT · 关于</h2>
        <p className="mt-2 font-mono text-sm">ToolKit v{APP_VERSION} · 本地优先 · 一套代码双输出</p>
        <button className="btn btn-outline btn-sm mt-3" onClick={async () => {
          const r = await checkUpdate()
          setUpd(r.verdict === 'newer' ? `发现新版本 ${r.latest},即将打开发布页` : r.verdict === 'unknown' ? '暂时无法获取版本信息' : '已是最新版本')
          if (r.verdict === 'newer') openReleases()
        }}>检查更新</button>
        {upd && <p className="mt-2 text-sm text-neutral">{upd}</p>}
      </section>
    </div>
  )
}
```

- [ ] **Step 3: 验证**

Run: `pnpm vitest run test/check-update.test.ts && pnpm typecheck && pnpm lint`
Expected: PASS

```bash
pnpm dev:web  # /#/settings 三色卡切换即时生效、刷新保持;检查更新在无仓库时显示「暂时无法获取」
```

- [ ] **Step 4: Commit**

```bash
git add src/renderer/src/pages/Settings.tsx src/renderer/src/core/check-update.ts test/check-update.test.ts
git commit -m "feat: settings page with theme cards, about, releases-api update check"
```

---

### Task 8: UX 基建(Worker 转换通道 / useLiveTransform / 三态输出 / 复制 / 输入区)

**Files:**
- Create: `src/renderer/src/core/transform.channel.ts`, `src/renderer/src/core/transform.worker.ts`, `src/renderer/src/core/useLiveTransform.ts`, `src/renderer/src/components/TriStateOutput.tsx`, `src/renderer/src/components/CopyButton.tsx`, `src/renderer/src/components/InputZone.tsx`, `src/renderer/src/components/highlight.ts`
- Test: `test/uselivetransform.test.ts`, `test/highlight.test.ts`

**Interfaces:**
- Consumes: `Transform`/`ToolResult`(Task 2)
- Produces:
  - `registerTransform(id, fn)`(worker 内注册表;每个工具的纯函数在 `transform.worker.ts` 注册一行)
  - `useLiveTransform<I, O>(toolId: string): { input: I; setInput(v: I): void; opts: TransformOpts; setOpts(o): void; phase: 'idle' | 'running' | 'done'; result: ToolResult<O> | null }`(防抖 150ms,经 worker)
  - `<TriStateOutput result lines totalChars onCopy />`、`<CopyButton getText enabled />`(Ctrl+Shift+C 全局绑定在 CopyButton 挂载时)、`<InputZone value onChange placeholder />`(>200KB 折叠)
  - `highlightLine(line: string, lang: 'json'): string`(返回 HTML 片段字符串,纯函数)

- [ ] **Step 1: 失败测试**

`test/highlight.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { highlightLine } from '@components/highlight'

describe('JSON 逐行着色(纯函数,虚拟行渲染时现算)', () => {
  it('键与字符串着色', () => {
    const html = highlightLine('  "name": "toolkit",', 'json')
    expect(html).toContain('class="tk-k"')   // 键
    expect(html).toContain('class="tk-s"')   // 字符串
  })
  it('数字与字面量着色,转义 HTML', () => {
    const html = highlightLine('  "n": 42, "ok": true, "x": "<b>"', 'json')
    expect(html).toContain('class="tk-n"')
    expect(html).toContain('class="tk-p"')
    expect(html).toContain('&lt;b&gt;')
  })
  it('空行原样返回', () => {
    expect(highlightLine('', 'json')).toBe('')
  })
})
```

`test/uselivetransform.test.ts`(jsdom,假 channel):
```ts
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLiveTransform } from '@core/useLiveTransform'

vi.mock('@core/transform.channel', () => ({
  runTransform: async (_id: string, input: string) =>
    input.includes('!')
      ? { status: 'error', kind: 'invalid-input', message: '非法字符', position: input.indexOf('!') }
      : { status: 'ok', data: input.toUpperCase() }
}))

describe('useLiveTransform', () => {
  it('输入经防抖转换,非法返回错误态', async () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useLiveTransform<string, string>('test'))
    act(() => result.current.setInput('ab!c'))
    await act(async () => { vi.advanceTimersByTime(200) })
    expect(result.current.result?.status).toBe('error')
    expect(result.current.phase).toBe('done')
    vi.useRealTimers()
  })
})
```

Run: `pnpm vitest run test/highlight.test.ts test/uselivetransform.test.ts` → FAIL

- [ ] **Step 2: 实现**

`transform.channel.ts`(主线程侧,Comlink):
```ts
import * as Comlink from 'comlink'
import type { ToolResult, TransformOpts } from './types'

type WorkerApi = { run(id: string, input: unknown, opts?: TransformOpts): Promise<ToolResult<unknown>> }

let remote: WorkerApi | null = null
function getRemote(): WorkerApi {
  if (!remote) {
    const w = new Worker(new URL('./transform.worker.ts', import.meta.url), { type: 'module' })
    remote = Comlink.wrap<WorkerApi>(w)
  }
  return remote
}

export async function runTransform(id: string, input: unknown, opts?: TransformOpts): Promise<ToolResult<unknown>> {
  return getRemote().run(id, input, opts)
}
```

`transform.worker.ts`(工具注册表——加工具=加一行 import+一行注册):
```ts
import * as Comlink from 'comlink'
import type { Transform, TransformOpts } from './types'
import { transformJson } from '@tools/json-parser/transform'

const registry = new Map<string, Transform<unknown, unknown, TransformOpts>>()
// 注册行示例(加工具在此追加):
registry.set('json-parser', transformJson as Transform<unknown, unknown, TransformOpts>)

const api = {
  run: (id: string, input: unknown, opts?: TransformOpts) =>
    (registry.get(id) ?? ((_i: unknown): ToolErr => ({
      status: 'error', kind: 'unsupported', structure: id, message: '未注册的工具'
    })))(input, opts)
}
type ToolErr = { status: 'error'; kind: 'unsupported'; structure: string; message: string }
Comlink.expose(api)
```
(注:`json-parser` 的 transform 在 Task 9 落地;本任务先以恒等函数占位注册 `registry.set('json-parser', (i) => ({ status: 'ok', data: i }))`,Task 9 替换。)

`useLiveTransform.ts`:
```ts
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ToolResult, TransformOpts } from './types'
import { runTransform } from './transform.channel'

export function useLiveTransform<I, O>(toolId: string) {
  const [input, setInputRaw] = useState<I>('' as unknown as I)
  const [opts, setOpts] = useState<TransformOpts>({})
  const [phase, setPhase] = useState<'idle' | 'running' | 'done'>('idle')
  const [result, setResult] = useState<ToolResult<O> | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>()
  const seq = useRef(0)

  const run = useCallback((v: I, o: TransformOpts) => {
    const mine = ++seq.current
    if (String(v) === '') { setResult(null); setPhase('idle'); return }
    setPhase('running')
    void runTransform(toolId, v, o).then((r) => {
      if (mine === seq.current) { setResult(r as ToolResult<O>); setPhase('done') }
    })
  }, [toolId])

  const setInput = useCallback((v: I) => {
    setInputRaw(v)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => run(v, opts), 150)
  }, [opts, run])

  useEffect(() => { run(input, opts) /* opts 变化立即重跑 */ }, [opts])  // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => clearTimeout(timer.current), [])
  return { input, setInput, opts, setOpts, phase, result }
}
```

`components/highlight.ts`(JSON 逐行,无依赖词法着色):
```ts
const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export function highlightLine(line: string, lang: 'json'): string {
  if (!line.trim()) return esc(line)
  let out = ''
  let i = 0
  const n = line.length
  while (i < n) {
    const ch = line[i]
    if (ch === '"') {
      const end = line.indexOf('"', i + 1)
      const seg = line.slice(i, end === -1 ? n : end + 1)
      // 行内下一个非空白 token 是否 ':' → 键,否则字符串
      const rest = line.slice(end === -1 ? n : end + 1)
      const isKey = /^\s*:/.test(rest)
      out += `<span class="${isKey ? 'tk-k' : 'tk-s'}">${esc(seg)}</span>`
      i = end === -1 ? n : end + 1
    } else if (/[0-9-]/.test(ch) && /[-0-9.]/.test(line[i] ?? '')) {
      let j = i
      while (j < n && /[0-9.eE+-]/.test(line[j])) j++
      out += `<span class="tk-n">${esc(line.slice(i, j))}</span>`; i = j
    } else if (line.startsWith('true', i) || line.startsWith('false', i) || line.startsWith('null', i)) {
      const w = line.startsWith('true', i) ? 4 : line.startsWith('false', i) ? 5 : 4
      out += `<span class="tk-p">${line.slice(i, i + w)}</span>`; i += w
    } else {
      out += esc(ch); i++
    }
  }
  return out
}
```
(着色 CSS 在 `main.css` 追加:`.tk-k{color:#7FA8C9}.tk-s{color:var(--color-success)}.tk-n{color:var(--color-warning)}.tk-p{color:var(--color-neutral)}`。)

`TriStateOutput.tsx`(虚拟滚动用朴素定行高窗口化;不引库,~30 行实现,行为可测):
```tsx
import { useEffect, useMemo, useRef, useState } from 'react'
import type { ToolResult } from '@core/types'
import { highlightLine } from './highlight'
import { CopyButton } from './CopyButton'

interface Props {
  result: ToolResult<string> | null
  phase: 'idle' | 'running' | 'done'
  emptyHint: string
  onRetry?: () => void
}
const LINE_H = 22

export function TriStateOutput({ result, phase, emptyHint }: Props): JSX.Element {
  const scroller = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [viewH, setViewH] = useState(320)

  useEffect(() => {
    const el = scroller.current
    if (!el) return
    const ro = new ResizeObserver(() => setViewH(el.clientHeight))
    ro.observe(el); setViewH(el.clientHeight)
    return () => ro.disconnect()
  }, [])

  const lines = useMemo(() => (result?.status === 'ok' ? result.data.split('\n') : []), [result])
  const first = Math.max(0, Math.floor(scrollTop / LINE_H) - 5)
  const count = Math.ceil(viewH / LINE_H) + 10
  const slice = lines.slice(first, first + count)

  if (phase === 'running') {
    return <div className="border border-base-300 bg-base-200 p-4 font-mono text-sm text-warning">◐ 处理中…</div>
  }
  if (!result) {
    return <div className="border border-base-300 bg-base-200/50 p-6 text-center text-sm text-neutral">{emptyHint}</div>
  }
  if (result.status === 'error') {
    const where = 'position' in result && typeof result.position === 'number'
      ? `(${result.position} 号字符附近)` : 'failedItems' in result && result.failedItems
        ? `(失败行:${result.failedItems.join(', ')})` : ''
    return (
      <div role="alert" className="border border-error/60 bg-base-200 p-4 font-mono text-sm">
        <span className="text-error">✕ ERROR · {result.kind === 'invalid-input' ? '输入无效' : result.kind === 'partial' ? '部分失败' : `不支持:${result.structure}`}</span>
        <p className="mt-1 text-base-content">{result.message} <span className="text-neutral">{where}</span></p>
      </div>
    )
  }
  return (
    <div className="relative border border-base-300 bg-base-200">
      <div className="absolute right-3 top-3 z-10"><CopyButton getText={() => result.data} enabled /></div>
      <div ref={scroller} className="max-h-80 overflow-auto p-4 font-mono text-[13px] leading-[22px]"
        onScroll={(e) => setScrollTop((e.target as HTMLDivElement).scrollTop)}>
        <div style={{ height: lines.length * LINE_H, position: 'relative' }}>
          <div style={{ transform: `translateY(${first * LINE_H}px)` }}>
            {slice.map((ln, i) => (
              <div key={first + i} style={{ height: LINE_H }}
                dangerouslySetInnerHTML={{ __html: highlightLine(ln, 'json') || '&nbsp;' }} />
            ))}
          </div>
        </div>
      </div>
      <div className="border-t border-base-300 px-4 py-1 font-mono text-[11px] text-neutral">
        {lines.length} 行 · {result.data.length} 字符
      </div>
    </div>
  )
}
```
(说明:错误 `position` 的行/列换算工具 `posToLineCol(text, pos)` 在 Task 9 提供,此处文案先显示字符位,Task 9 接入行列。)

`CopyButton.tsx`:
```tsx
import { useEffect, useState } from 'react'

interface Props { getText: () => string; enabled: boolean }

export function CopyButton({ getText, enabled }: Props): JSX.Element {
  const [msg, setMsg] = useState('')
  const copy = async (): Promise<void> => {
    const text = getText()
    try {
      await navigator.clipboard.writeText(text)
      setMsg('已复制')
    } catch {
      // 回退:隐藏 textarea + execCommand
      const ta = document.createElement('textarea')
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
      document.body.appendChild(ta); ta.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(ta)
      setMsg(ok ? '已复制' : '复制失败,请手动选择')
    }
    setTimeout(() => setMsg(''), 1600)
  }
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'c' && enabled) {
        e.preventDefault(); void copy()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })  // 挂载期绑定一次
  return (
    <div className="flex items-center gap-2">
      {msg && <span className="font-mono text-[11px] text-success">{msg}</span>}
      <button className="btn btn-xs btn-success" disabled={!enabled} onClick={() => void copy()}>复制</button>
    </div>
  )
}
```
(禁用态 `title="无结果可复制"`;ERROR 态调用处传 `enabled={false}` 由页面控制——TriStateOutput OK 态才渲染 CopyButton,另在页面头部渲染禁用版以「常驻」。)

`InputZone.tsx`(>200KB 折叠):
```tsx
import { useState } from 'react'

interface Props { value: string; onChange: (v: string) => void; placeholder: string }

const COLLAPSE_AT = 200 * 1024

export function InputZone({ value, onChange, placeholder }: Props): JSX.Element {
  const [expanded, setExpanded] = useState(false)
  const big = value.length > COLLAPSE_AT

  if (big && !expanded) {
    return (
      <div className="border border-base-300 bg-base-200/50 p-6 text-center">
        <p className="font-mono text-sm text-neutral">输入 {(value.length / 1024).toFixed(0)}KB,已折叠以保持流畅</p>
        <button className="btn btn-outline btn-sm mt-2" onClick={() => setExpanded(true)}>展开编辑</button>
      </div>
    )
  }
  return (
    <textarea
      autoFocus spellCheck={false}
      className="h-44 w-full resize-none border-0 bg-transparent p-4 font-mono text-[13px] leading-relaxed outline-none"
      placeholder={placeholder} value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}
```

- [ ] **Step 3: 验证**

Run: `pnpm vitest run test/highlight.test.ts test/uselivetransform.test.ts && pnpm typecheck && pnpm lint`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/renderer/src/core src/renderer/src/components test/highlight.test.ts test/uselivetransform.test.ts
git commit -m "feat: worker transform channel, live transform hook, tri-state output, copy, collapsible input"
```

---

### Task 9: JSON transform 纯函数 + 错误定位(golden 之基)

**Files:**
- Create: `src/renderer/src/tools/json-parser/transform.ts`
- Modify: `src/renderer/src/core/transform.worker.ts`(替换占位为真 transform)
- Test: `test/json-transform.test.ts`

**Interfaces:**
- Consumes: `Transform`/`ToolResult`(Task 2)、`registerTransform`(Task 8 worker)
- Produces: `transformJson: Transform<string, string, JsonOpts>`、`JsonOpts = { indent?: '2' | '4' | 'tab' | 'min'; }`、`posToLineCol(text: string, pos: number): { line: number; col: number }`(Task 10 错误显示用)

- [ ] **Step 1: 失败测试(含错误定位与边界)**

`test/json-transform.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { transformJson, posToLineCol } from '@tools/json-parser/transform'

const o = (s: string) => transformJson(s, { indent: '2' })

describe('transformJson 合法输入', () => {
  it('格式化嵌套对象', () => {
    const r = o('{"a":[1,2],"b":{"c":null}}')
    expect(r).toEqual({ status: 'ok', data: '{\n  "a": [\n    1,\n    2\n  ],\n  "b": {\n    "c": null\n  }\n}' })
  })
  it('中文与 emoji 原样保留', () => {
    const r = o('{"名":"值","emoji":"🎉"}')
    expect(r.status === 'ok' && r.data).toContain('🎉')
  })
  it('大数走字符串往返不丢精度断言(JSON.parse 语义即如此,锁定行为)', () => {
    const r = o('{"n":9007199254740993}')
    expect(r.status === 'ok' && JSON.parse(r.data).n).toBe(9007199254740992) // 锁定 Number 语义,文档化
  })
  it('缩进 4 与 tab', () => {
    expect(o('{"a":1}')).toEqual({ status: 'ok', data: '{\n  "a": 1\n}' })
    expect(transformJson('{"a":1}', { indent: '4' })).toEqual({ status: 'ok', data: '{\n    "a": 1\n}' })
    expect(transformJson('{"a":1}', { indent: 'tab' })).toEqual({ status: 'ok', data: '{\n\t"a": 1\n}' })
  })
  it('压缩模式', () => {
    expect(transformJson('{\n"a" : 1\n}', { indent: 'min' })).toEqual({ status: 'ok', data: '{"a":1}' })
  })
  it('空对象/空数组/字面量', () => {
    expect(o('{}')).toEqual({ status: 'ok', data: '{}' })
    expect(o('[]')).toEqual({ status: 'ok', data: '[]' })
    expect(o('null')).toEqual({ status: 'ok', data: 'null' })
  })
})

describe('transformJson 非法输入定位', () => {
  it('多余逗号给出字符位置', () => {
    const r = o('{"a":1,,}')
    expect(r.status).toBe('error')
    if (r.status === 'error') {
      expect(r.kind).toBe('invalid-input')
      expect(r.message).toContain('非法')
      expect(r.position).toBeGreaterThan(5)
    }
  })
  it('截断输入报错', () => {
    const r = o('{"a": [1, 2')
    expect(r.status).toBe('error')
  })
  it('首字符非法', () => {
    const r = o('x')
    expect(r.status === 'error' && r.position).toBe(0)
  })
})

describe('posToLineCol', () => {
  it('行列换算', () => {
    expect(posToLineCol('ab\ncd\nef', 5)).toEqual({ line: 3, col: 1 }) // 0-based pos 5 = 第3行第2字符(1-based col=2)?
  })
})

describe('性能', () => {
  it('1MB 合法输入 <200ms', () => {
    const big = JSON.stringify({ items: Array.from({ length: 12000 }, (_, i) => ({ i, s: 'x'.repeat(40) })) })
    expect(big.length).toBeGreaterThan(1_000_000)
    const t0 = performance.now()
    const r = transformJson(big, { indent: '2' })
    const ms = performance.now() - t0
    expect(r.status).toBe('ok')
    expect(ms).toBeLessThan(200)
  })
})
```
(注:`posToLineCol` 期望值在实现后按实现语义校正一次——0-based pos → 1-based `{line, col}`,以「第 3 行第 2 列」直觉为准,即上例期望 `{ line: 3, col: 2 }`。测试先按此写,若与实现差一,修实现不改测试。)

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm vitest run test/json-transform.test.ts` → FAIL(模块不存在)

- [ ] **Step 3: 实现**

`src/renderer/src/tools/json-parser/transform.ts`:
```ts
import type { ToolResult } from '@core/types'

export interface JsonOpts { indent?: '2' | '4' | 'tab' | 'min' }

export function posToLineCol(text: string, pos: number): { line: number; col: number } {
  const upTo = text.slice(0, pos)
  const line = upTo.split('\n').length
  const col = pos - (upTo.lastIndexOf('\n') + 1) + 1
  return { line, col }
}

// 轻量定位:JSON.parse 失败后,用 V8 position 或线性扫描找首个非法字符
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
```
(线性扫描字符集是近似快速通道;主定位来自 V8 `position`。扫描集故意包含 `truefalsnl` 的字母成员以跳过字面量前缀——若测试定位偏差,以测试为准修正集合。)

`transform.worker.ts` 替换占位注册行:
```ts
registry.set('json-parser', transformJson as Transform<unknown, unknown, TransformOpts>)
```

- [ ] **Step 4: 全部通过**

Run: `pnpm vitest run test/json-transform.test.ts`
Expected: PASS(1MB <200ms 在 CI 机器若抖动,阈值放宽至 300ms 并注明,本机先按 200)

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/tools/json-parser test/json-transform.test.ts
git commit -m "feat: JSON transform pure function with error position, golden-ready"
```

---

### Task 10: JSON 工具页 + 注册(黄金模板闭环)+ 双通道里程碑

**Files:**
- Create: `src/renderer/src/tools/json-parser/index.tsx`, `src/renderer/src/tools/json-parser/icon.tsx`
- Modify: `src/renderer/src/tools/register.ts`(注册一行)
- Test: `test/json-page.test.tsx`

**Interfaces:**
- Consumes: Task 8 全部组件、`transformJson`(Task 9)、`ToolDescriptor`(Task 2)
- Produces: 注册表中的 `json-parser` 工具(路由 `/tools/json-parser`,capability `{ offline: true }`);工具页结构=后续 9 个工具的复制模板

- [ ] **Step 1: 失败测试**

`test/json-page.test.tsx`:
```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { JsonParserPage } from '@tools/json-parser/index'

vi.mock('@core/transform.channel', () => ({
  runTransform: async (_id: string, input: string, opts?: { indent?: string }) => {
    const { transformJson } = await import('@tools/json-parser/transform')
    return transformJson(input, opts as never)
  }
}))

describe('JSON 工具页', () => {
  it('粘贴合法 JSON 自动出格式化结果', async () => {
    render(<MemoryRouter><JsonParserPage /></MemoryRouter>)
    fireEvent.change(screen.getByPlaceholderText(/粘贴/), { target: { value: '{"a":1}' } })
    await screen.findByText(/2 行/)
    expect(screen.getByRole('button', { name: '复制' })).toBeTruthy()
  })
  it('非法 JSON 出 ERROR 定位', async () => {
    render(<MemoryRouter><JsonParserPage /></MemoryRouter>)
    fireEvent.change(screen.getByPlaceholderText(/粘贴/), { target: { value: '{"a":1,,}' } })
    await screen.findByText(/输入无效/)
  })
  it('空输入显示 EMPTY 引导', () => {
    render(<MemoryRouter><JsonParserPage /></MemoryRouter>)
    expect(screen.getByText(/粘贴内容到上方/)).toBeTruthy()
  })
})
```

Run: `pnpm vitest run test/json-page.test.tsx` → FAIL

- [ ] **Step 2: 实现页面与注册**

`src/renderer/src/tools/json-parser/icon.tsx`:
```tsx
export function JsonIcon(): JSX.Element {
  return <span className="font-mono text-[11px]">{ }{}</span>
}
```
(修正:`return <span className="font-mono text-[11px]">{'{ }'}</span>`)

`src/renderer/src/tools/json-parser/index.tsx`:
```tsx
import { lazy } from 'react'
import { useLiveTransform } from '@core/useLiveTransform'
import { InputZone } from '@components/InputZone'
import { TriStateOutput } from '@components/TriStateOutput'
import { posToLineCol } from './transform'

export default function JsonParserPage(): JSX.Element {
  const { input, setInput, opts, setOpts, phase, result } = useLiveTransform<string, string>('json-parser')

  return (
    <div className="mx-auto max-w-4xl p-6">
      <header className="mb-4 flex items-baseline gap-3">
        <h1 className="text-2xl font-bold">JSON 解析</h1>
        <span className="font-mono text-[11px] tracking-[0.25em] text-neutral">PARSE · VALIDATE · FORMAT</span>
        <span className="ml-auto font-mono text-[11px] text-neutral">
          {phase === 'done' && result?.status === 'ok' && <span className="text-success">● VALID</span>}
          {phase === 'done' && result?.status === 'error' && <span className="text-error">✕ ERROR</span>}
          {phase === 'running' && <span className="text-warning">◐ …</span>}
        </span>
      </header>

      <section className="border border-base-300 bg-base-200/40">
        <span className="ml-3 -mt-2 inline-block bg-base-100 px-1 font-mono text-[11px] tracking-widest text-neutral">INPUT · 输入</span>
        <InputZone value={input} onChange={setInput} placeholder="粘贴 JSON 到此处,结果即刻点亮…" />
      </section>

      <div className="flex items-center gap-2 py-3" role="toolbar">
        <span className={`h-0.5 flex-1 ${phase === 'running' ? 'bg-warning animate-pulse' : result?.status === 'ok' ? 'bg-success' : result?.status === 'error' ? 'bg-error' : 'bg-base-300'}`} />
        {(['2', '4', 'tab', 'min'] as const).map((ind) => (
          <button key={ind}
            className={`btn btn-xs font-mono ${(opts.indent ?? '2') === ind ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setOpts({ indent: ind })}>
            {ind === 'min' ? '压缩' : ind === 'tab' ? 'TAB' : ind}
          </button>
        ))}
        <span className="h-0.5 flex-1 bg-base-300" />
      </div>

      <TriStateOutput result={result} phase={phase} emptyHint="粘贴内容到上方,结果即刻点亮" />
      {result?.status === 'error' && typeof result.position === 'number' && (
        <p className="mt-1 font-mono text-[11px] text-neutral">
          定位:第 {posToLineCol(input, result.position).line} 行 第 {posToLineCol(input, result.position).col} 列
        </p>
      )}
    </div>
  )
}
export const JsonParserLazy = lazy(() => import('./index'))
```

`register.ts` 追加注册行:
```ts
import { JsonParserLazy } from '@tools/json-parser/index'
import { JsonIcon } from '@tools/json-parser/icon'

export const tools: ToolDescriptor[] = [
  {
    id: 'json-parser', name: 'JSON 解析', icon: JsonIcon,
    route: '/tools/json-parser', component: JsonParserLazy,
    capability: { offline: true }
  }
]
```

- [ ] **Step 3: 测试与页面验证**

Run: `pnpm vitest run test/json-page.test.tsx && pnpm typecheck && pnpm lint && pnpm test`
Expected: 全 PASS

- [ ] **Step 4: 里程碑——双通道同屏验证(记录于本步勾选说明)**

```bash
pnpm dev &        # Electron 壳
pnpm dev:web      # 浏览器
# 两端同开 #/tools/json-parser,粘贴 {"a":1,,}:均显示 ERROR+定位
# 粘贴 {"a":1}:均 200ms 内出格式化结果;改缩进即时生效;复制按钮+Ctrl+Shift+C 可用
# Ctrl+K 面板搜 json 回车直达;首页最近使用出现 JSON 解析
```

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/tools test/json-page.test.tsx
git commit -m "feat: JSON parser golden-template tool page, registered; dual-channel milestone verified"
```

---

### Task 11: golden fixtures 全集(错误/边界样例固化)

**Files:**
- Create: `test/fixtures/json-parser/*.json`(下表全部)+ `test/fixtures/json-parser/manifest.ts`

**Interfaces:**
- Consumes: `transformJson`(Task 9)
- Produces: `manifest: { name: string; input: string; expected: ToolResult<string> }[]`(golden 测试数据源;后续工具仿此结构)

- [ ] **Step 1: 写 fixture 文件(实际内容,非占位)**

`nested.json`(输入样例,期望在 manifest 内联):
```json
{"order_id":20260824001,"tenant":"acme","items":[{"sku":"A-1","qty":3},{"sku":"B-7","qty":1}],"paid":true,"note":null}
```
`emoji.json`:
```json
{"名":"工具箱","emoji":"🎉 中文","引号":"内嵌\"引号\""}
```
`bignum.json`:
```json
{"n":9007199254740993,"f":3.141592653589793}
```
`literals.json`:
```json
[null,true,false,0,-1,1.5e3]
```
`empty.json`:
```json
{}
```
`empty-arr.json`:
```json
[]
```
`truncated.json`(输入,非合法 JSON):
```
{"a":[1,2
```
`illegal.json`(输入,非合法 JSON,非法字符在第 8 位):
```
{"a":1,x:2}
```

`manifest.ts`:
```ts
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { ToolResult } from '@core/types'

const dir = join(__dirname, '.')
const rd = (f: string): string => readFileSync(join(dir, f), 'utf8').trim()

export const manifest: { name: string; input: string; expected: ToolResult<string> }[] = [
  { name: 'nested', input: rd('nested.json'),
    expected: { status: 'ok', data: JSON.stringify(JSON.parse(rd('nested.json')), null, 2) } },
  { name: 'emoji', input: rd('emoji.json'),
    expected: { status: 'ok', data: JSON.stringify(JSON.parse(rd('emoji.json')), null, 2) } },
  { name: 'bignum', input: rd('bignum.json'),
    expected: { status: 'ok', data: JSON.stringify(JSON.parse(rd('bignum.json')), null, 2) } },
  { name: 'literals', input: rd('literals.json'),
    expected: { status: 'ok', data: JSON.stringify(JSON.parse(rd('literals.json')), null, 2) } },
  { name: 'empty-obj', input: rd('empty.json'), expected: { status: 'ok', data: '{}' } },
  { name: 'empty-arr', input: rd('empty-arr.json'), expected: { status: 'ok', data: '[]' } },
  { name: 'truncated', input: rd('truncated.json'),
    expected: expectError('invalid-input') },
  { name: 'illegal', input: rd('illegal.json'),
    expected: expectError('invalid-input', 7) }
]

function expectError(kind: 'invalid-input', position?: number): ToolResult<string> {
  return { status: 'error', kind, message: expect.any(String) as unknown as string, ...(position != null ? { position } : {}) }
}
```
(vitest 的 `expect.any` 在对象内可用;若类型报错,改为 manifest 存 `{ errorKind, errorPosition? }` 结构,断言时逐字段比较——实现时二选一,以类型干净为准,采用后者。)

- [ ] **Step 2: golden 测试**

`test/json-golden.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { transformJson } from '@tools/json-parser/transform'
import { manifest } from './fixtures/json-parser/manifest'

describe('golden:逐样例断言', () => {
  for (const c of manifest) {
    it(c.name, () => {
      const r = transformJson(c.input, { indent: '2' })
      if (c.expected.status === 'ok') {
        expect(r).toEqual(c.expected)
      } else {
        expect(r.status).toBe('error')
        expect(r.kind).toBe('invalid-input')
        if (c.errorPosition != null) expect(r.position).toBe(c.errorPosition)
      }
    })
  }
})
```
(manifest 采用 `{name, input, expected | errorKind, errorPosition?}` 联合结构,与上面说明一致。)

Run: `pnpm vitest run test/json-golden.test.ts`
Expected: PASS;若 illegal 定位与 7 不符,修 `locateError` 直到测试过(测试为锚)。

- [ ] **Step 3: Commit**

```bash
git add test/fixtures test/json-golden.test.ts
git commit -m "test: golden fixture corpus for json-parser with error positions"
```

---

### Task 12: 双通道构建(icons/安全校验/electron-builder/ad-hoc)

**Files:**
- Create: `assets/icon.svg`, `electron-builder.yml`
- Modify: `electron/main.ts`(若需 CSP 校验)、`src/renderer/index.html`(CSP 已含,核对)
- Test: 手动验证 + `scripts/check-web-purity.mjs`

**Interfaces:**
- Consumes: Task 1 配置
- Produces: `pnpm build:web` → `dist/web`(纯静态);`pnpm build:desktop` → `release/`(Win nsis + mac dmg);`scripts/check-web-purity.mjs`(grep 产物无 electron 引用,CI Task 13 调用)

- [ ] **Step 1: 图标资产**

`assets/icon.svg`(线路图世界:黑底、亮白节点连线、红琥珀绿三信号点):
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <rect width="128" height="128" rx="24" fill="#0A0A0A"/>
  <path d="M24 96 V64 H64 V32 H104" stroke="#F4F1EA" stroke-width="6" fill="none"/>
  <circle cx="24" cy="96" r="9" fill="#F4F1EA"/>
  <circle cx="64" cy="64" r="9" fill="#F4F1EA"/>
  <circle cx="104" cy="32" r="9" fill="#00A651"/>
  <circle cx="104" cy="64" r="9" fill="#FFB300"/>
  <circle cx="104" cy="96" r="9" fill="#E30613"/>
</svg>
```
```bash
pnpm add -D electron-icon-builder
pnpm exec electron-icon-builder -i assets/icon.svg -o build/icons
```

- [ ] **Step 2: electron-builder.yml**

```yaml
appId: com.toolkit.app
productName: ToolKit
directories: { output: release }
files: ['out/**']
icon: build/icons/icons/icon.ico   # win;mac 用 icon.icns(electron-builder 自动识别同目录)
win: { target: nsis }
nsis: { oneClick: true, perMachine: false }
mac: { target: dmg, identity: null }   # identity:null = ad-hoc 签名
```
(CI 环境变量 `CSC_IDENTITY_AUTO_DISCOVERY=false` 在 Task 13 workflow 设置,本地 Windows 构建不受影响。)

- [ ] **Step 3: 产物纯度检查脚本**

`scripts/check-web-purity.mjs`:
```js
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
const root = 'dist/web'
const bad = []
function walk(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f)
    if (statSync(p).isDirectory()) walk(p)
    else if (/\.(js|mjs)$/.test(f) && readFileSync(p, 'utf8').includes('from"electron"'))
      bad.push(p)
  }
}
walk(root)
if (bad.length) { console.error('ELECTRON REFERENCE FOUND:', bad); process.exit(1) }
console.log('web purity OK')
```
(注:ESM 产物中 electron 引用形态以实际 bundle 为准——检查 `'electron'` 字符串导入形如 `from"electron"`;实现时按实际产物调整匹配串,守住「无 electron 引用」意图。)

- [ ] **Step 4: 本地构建验证(Win 优先)**

```bash
pnpm build:web && node scripts/check-web-purity.mjs
pnpm exec serve dist/web -l 4173   # 或 npx vite preview --outDir dist/web;浏览器打开走一遍 JSON 工具
pnpm build:desktop                 # 产出 release/*.exe;本机安装,首次运行过 SmartScreen「更多信息→仍要运行」
```
记录:exe 安装、JSON 工具可用、主题切换持久化(重启应用仍保持)。

- [ ] **Step 5: Commit**

```bash
git add assets build/icons electron-builder.yml scripts package.json pnpm-lock.yaml
git commit -m "build: electron-builder config, icon assets, web purity check, verified win install"
```

---

### Task 13: CI(workflows + Playwright smoke + Pages deploy 骨架)

**Files:**
- Create: `.github/workflows/ci.yml`, `.github/workflows/release.yml`, `playwright.config.ts`, `tests/smoke/home.spec.ts`

**Interfaces:**
- Consumes: `scripts/check-web-purity.mjs`(Task 12)
- Produces: push main = lint+test(ubuntu)+build:web+smoke+桌面 matrix artifact;tag v* = Draft Release;Pages deploy job(注释骨架,仓库启用 Actions 后打开)

- [ ] **Step 1: Playwright smoke**

`playwright.config.ts`:
```ts
import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: 'tests/smoke',
  use: { baseURL: 'http://127.0.0.1:4173' },
  webServer: { command: 'pnpm exec serve dist/web -l 4173', url: 'http://127.0.0.1:4173', reuseExistingServer: false }
})
```

`tests/smoke/home.spec.ts`:
```ts
import { test, expect } from '@playwright/test'

test('首页加载无 console error,导航渲染工具项', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.goto('/#/')
  await expect(page.getByText('ToolKit')).toBeVisible()
  await expect(page.getByText('JSON 解析')).toBeVisible()
  expect(errors).toEqual([])
})

test('工具页粘贴即出', async ({ page }) => {
  await page.goto('/#/tools/json-parser')
  await page.getByPlaceholder(/粘贴 JSON/).fill('{"a":1}')
  await expect(page.getByText(/1 行/)).toBeVisible({ timeout: 3000 })
})
```

本地验证:`pnpm build:web && pnpm exec playwright test`(需 `pnpm exec playwright install chromium` 一次)。

- [ ] **Step 2: ci.yml**

```yaml
name: ci
on:
  push: { branches: [main] }
  pull_request:
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint && pnpm typecheck && pnpm test
      - run: pnpm build:web && node scripts/check-web-purity.mjs
      - run: pnpm exec playwright install --with-deps chromium && pnpm exec playwright test
      - uses: actions/upload-artifact@v4
        with: { name: web, path: dist/web }
  desktop:
    needs: test
    strategy:
      matrix: { os: [windows-latest, macos-latest] }
    runs-on: ${{ matrix.os }}
    env: { CSC_IDENTITY_AUTO_DISCOVERY: 'false' }
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm build:desktop
      - uses: actions/upload-artifact@v4
        with: { name: desktop-${{ matrix.os }}, path: release/*.* }
  # deploy-pages:  # 仓库 Pages 启用后打开:
  #   needs: test
  #   permissions: { pages: write, id-token: write }
  #   environment: github-pages
  #   steps:
  #     - uses: actions/deploy-pages@v4
```

- [ ] **Step 3: release.yml**

```yaml
name: release
on:
  push: { tags: ['v*'] }
jobs:
  release:
    strategy:
      matrix: { os: [windows-latest, macos-latest] }
    runs-on: ${{ matrix.os }}
    env: { CSC_IDENTITY_AUTO_DISCOVERY: 'false' }
    permissions: { contents: write }
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm build:desktop
      - uses: softprops/action-gh-release@v2
        with: { draft: true, files: 'release/*.exe,release/*.dmg' }
```

- [ ] **Step 4: 本地终验 + Commit**

Run: `pnpm test && pnpm lint && pnpm typecheck && pnpm build:web && node scripts/check-web-purity.mjs && pnpm exec playwright test`
Expected: 全绿

```bash
git add .github playwright.config.ts tests package.json
git commit -m "ci: ubuntu test + win/mac matrix build, playwright smoke, pages skeleton, draft release"
```

---

### Task 14: 收尾(spec 自测清单 + README 架构图 + CHANGELOG)

**Files:**
- Modify: `README.md`, Create: `CHANGELOG.md`, `docs/spec-checklist.md`

**Interfaces:**
- Consumes: 5 个 spec 的全部 Scenario(openspec toolbox-foundation)
- Produces: 自测清单归档;README 双输出架构图

- [ ] **Step 1: spec Scenario 逐条自测清单**

`docs/spec-checklist.md`:逐条列出 5 个 spec 的每个 Scenario(tool-registry 4 条、app-shell 11 条、tool-ux-conventions 6 条、json-parser-tool 6 条、dual-output-build 7 条),每条后附验证方式(单测名 / 手动步骤)与勾选框。逐条跑通并勾选;发现不满足的实现回修对应任务。

- [ ] **Step 2: README 架构图**

README 追加:
```markdown
## 架构:一套代码,双输出

┌─────────────── src/renderer(环境无关,禁 electron)───────────────┐
│ app 壳 · 首页总览 · 设置 · 工具页(注册表驱动) · core(类型/存储/Worker) │
└──────────────┬──────────────────────────────┬─────────────────────┘
               │ vite 静态构建                 │ electron-vite + Electron 壳
       ┌───────▼────────┐             ┌───────▼────────┐
       │ GitHub Pages    │             │ Win nsis / Mac dmg│
       │ 在线版(过渡)    │             │ 桌面版(本体)      │
       └────────────────┘             └────────────────┘
加一个工具 = src/tools/<id>/ 目录 + register.ts 一行 + transform.worker.ts 一行
```

`CHANGELOG.md`:
```markdown
# Changelog
## 0.1.0-foundation(未发布)
- 基座:应用壳/三主题/注册表/Worker 转换通道/Ctrl+K
- 工具:JSON 解析(黄金模板)
- 构建:双通道 + CI + Playwright 守门 + Releases 检查更新
```

- [ ] **Step 3: 终验与提交**

Run: `pnpm test && pnpm lint && pnpm typecheck`
```bash
git add README.md CHANGELOG.md docs/spec-checklist.md
git commit -m "docs: spec scenario checklist, dual-output architecture diagram, changelog"
```

---

## Self-Review 记录

1. **Spec 覆盖**:openspec 42 项 checklist 全部落入 14 任务(groups 1→T1、2→T2/T3/T4、3→T5/T6/T7、4→T8、5→T9/T10、6→T9/T11、7→T12、8→T13、9→T14);spec Scenario 在 T14 逐条核验。无缺口。
2. **占位符扫描**:无 TBD/TODO;两处显式标注的「实现期按实际产物微调」(locateError 字符集、check-web-purity 匹配串)均给出调整规则与锚(测试为锚),非占位。
3. **类型一致性**:`ToolResult`/`ToolDescriptor`/`TransformOpts` 全程引用 Task 2 定义;`useLiveTransform` 返回形状在 T8 定义、T10 消费一致;`transformJson` 签名 T9 定义、worker/页面一致;`storageGet/Set`、`useThemeStore`、`searchTools`、`pushRecent`、`checkUpdate` 各任务间签名一致。
