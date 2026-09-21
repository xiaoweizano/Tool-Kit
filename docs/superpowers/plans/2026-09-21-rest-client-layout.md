# REST 客户端版式改版（Apifox 式上下结构 + 可折叠）实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 rest-api-client 从「左右并排三栏 + 五块纵向堆叠」改为上下分栏 + 请求区页签 + 可折叠可拖拽响应区 + 左栏页签式，一行数据流都不动。

**Architecture:** 纯逻辑先行（`split-layout.ts`：常量 / 夹紧 / 存储，全部可单测）→ 承载它的 hook（`use-rest-layout.ts`）→ 分隔条组件（`Splitter.tsx`，window 级 pointer 事件）→ 三个容器组件各自改版（`Sidebar` / `RequestPanel` / `ResponsePanel`）→ 最后 `index.tsx` 接线。每一层都独立可测，且不依赖下一层。

**Tech Stack:** React 18 + TypeScript + Tailwind v4 + daisyUI v5；vitest + @testing-library/react；pnpm。

**Spec:** `docs/superpowers/specs/2026-09-21-rest-client-apifox-layout-design.md`

## Global Constraints

- **renderer 内禁止直接调 `localStorage`**——一律走 `@core/storage` 的 `storageGet` / `storageSet`（见 `core/storage.ts` 首行注释）。
- **不新增依赖**；**不新增颜色 token**；不加大圆角 / 阴影 / 渐变（DESIGN.md）。
- **保留全部已有 `data-testid`**。现有测试断言**不得为迁就实现而改写**；只允许 spec §6 列出的两处按行为变更更新。
- **mono 标注**统一 `font-mono text-[11px]`；分区标签加 `tracking-widest`，元信息用 `text-neutral`。
- **UI 文案中文**；三态（空 / 进行中 / 失败）一律无静默失败。
- 命令：`pnpm test`（=`vitest run`）、`pnpm typecheck`（=`tsc --noEmit`）、`pnpm lint`（=`eslint .`）。
- 跑单个测试文件：`pnpm vitest run test/<file>`。加 `-t '<名字>'` 只跑某条。
- vitest 默认 `environment: 'node'`；**需要 DOM 的测试文件首行必须写 `// @vitest-environment jsdom`**。
- 别名（`vitest.config.ts`）：`@tools` → `src/renderer/src/tools`、`@core`、`@components`、`@app`、`@pages`。
- `test/setup.ts` 已把 `localStorage` stub 成 Map（只有 `getItem/setItem/removeItem/clear`）。测试里用 `beforeEach(() => { localStorage.clear() })` 隔离。
- jsdom **不实现 `Element.prototype.setPointerCapture`**、`getBoundingClientRect()` 恒返回全 0。所以：分隔条**不要**用 pointer capture（用 window 级监听），需要真实容器高度时由测试自造 ref。

---

### Task 1: `split-layout.ts` —— 布局记忆的纯逻辑

**Files:**
- Create: `src/renderer/src/tools/rest-api-client/split-layout.ts`
- Test: `test/rest-client-split-layout.test.ts`

**Interfaces:**
- Consumes: `storageGet` / `storageSet` from `@core/storage`
- Produces:
  - `LAYOUT_KEY = 'toolkit.rest-client.layout'`
  - `MIN_RESPONSE_H = 120`、`MAX_RESERVE = 160`、`DEFAULT_RESPONSE_H = 320`、`RESIZE_STEP = 16`
  - `interface SplitLayout { height: number; collapsed: boolean }`
  - `DEFAULT_LAYOUT: SplitLayout`（`{ height: 320, collapsed: false }`）
  - `maxResponseHeight(containerHeight: number): number` —— 容器高度不可测时返回 `Number.POSITIVE_INFINITY`（调用方据此跳过上界）
  - `clampResponseHeight(desired: number, containerHeight: number): number`
  - `normalizeLayout(raw: unknown): SplitLayout`
  - `readLayout(): SplitLayout`
  - `writeLayout(layout: SplitLayout): void`

- [ ] **Step 1: 写失败测试**

Create `test/rest-client-split-layout.test.ts`:

```ts
// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import {
  DEFAULT_LAYOUT,
  DEFAULT_RESPONSE_H,
  LAYOUT_KEY,
  MAX_RESERVE,
  MIN_RESPONSE_H,
  clampResponseHeight,
  maxResponseHeight,
  normalizeLayout,
  readLayout,
  writeLayout
} from '@tools/rest-api-client/split-layout'

beforeEach(() => {
  localStorage.clear()
})

describe('maxResponseHeight', () => {
  it('容器可测时 = 容器高 − MAX_RESERVE', () => {
    expect(maxResponseHeight(1000)).toBe(1000 - MAX_RESERVE)
  })

  it('容器高不足时不低于 MIN_RESPONSE_H(min 优先于上界)', () => {
    expect(maxResponseHeight(260)).toBe(MIN_RESPONSE_H)
  })

  it('容器高度不可测(0 / 负数 / NaN)时返回 Infinity,由调用方跳过上界', () => {
    expect(maxResponseHeight(0)).toBe(Number.POSITIVE_INFINITY)
    expect(maxResponseHeight(-10)).toBe(Number.POSITIVE_INFINITY)
    expect(maxResponseHeight(Number.NaN)).toBe(Number.POSITIVE_INFINITY)
  })
})

describe('clampResponseHeight', () => {
  it('夹在上下界之间', () => {
    expect(clampResponseHeight(500, 1000)).toBe(500)
    expect(clampResponseHeight(10, 1000)).toBe(MIN_RESPONSE_H)
    expect(clampResponseHeight(9999, 1000)).toBe(1000 - MAX_RESERVE)
  })

  it('容器不可测时只保底,绝不编造上界', () => {
    expect(clampResponseHeight(500, 0)).toBe(500)
    expect(clampResponseHeight(10, 0)).toBe(MIN_RESPONSE_H)
  })

  it('非法期望值回落默认高度', () => {
    expect(clampResponseHeight(Number.NaN, 1000)).toBe(DEFAULT_RESPONSE_H)
  })

  it('取整(拖拽会产生小数像素)', () => {
    expect(clampResponseHeight(400.6, 1000)).toBe(401)
  })
})

describe('normalizeLayout', () => {
  it('结构不对一律回落默认', () => {
    expect(normalizeLayout(null)).toEqual(DEFAULT_LAYOUT)
    expect(normalizeLayout(undefined)).toEqual(DEFAULT_LAYOUT)
    expect(normalizeLayout('x')).toEqual(DEFAULT_LAYOUT)
    expect(normalizeLayout({})).toEqual(DEFAULT_LAYOUT)
  })

  it('高度越界夹到 MIN', () => {
    expect(normalizeLayout({ height: 5, collapsed: true })).toEqual({ height: MIN_RESPONSE_H, collapsed: true })
  })

  it('高度非数字回落默认', () => {
    expect(normalizeLayout({ height: Number.NaN }).height).toBe(DEFAULT_RESPONSE_H)
    expect(normalizeLayout({ height: '500' }).height).toBe(DEFAULT_RESPONSE_H)
  })

  it('collapsed 只认布尔 true', () => {
    expect(normalizeLayout({ collapsed: 'yes' }).collapsed).toBe(false)
    expect(normalizeLayout({ collapsed: 1 }).collapsed).toBe(false)
    expect(normalizeLayout({ collapsed: true }).collapsed).toBe(true)
  })
})

describe('readLayout / writeLayout', () => {
  it('写入后可原样读回', () => {
    writeLayout({ height: 400, collapsed: true })
    expect(readLayout()).toEqual({ height: 400, collapsed: true })
  })

  it('无存储值时用默认布局', () => {
    expect(readLayout()).toEqual(DEFAULT_LAYOUT)
  })

  it('存储内容损坏时回落默认,不抛', () => {
    localStorage.setItem(LAYOUT_KEY, '{not json')
    expect(() => readLayout()).not.toThrow()
    expect(readLayout()).toEqual(DEFAULT_LAYOUT)
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm vitest run test/rest-client-split-layout.test.ts`
Expected: FAIL —— `Failed to resolve import "@tools/rest-api-client/split-layout"`

- [ ] **Step 3: 写最小实现**

Create `src/renderer/src/tools/rest-api-client/split-layout.ts`:

```ts
import { storageGet, storageSet } from '@core/storage'

/** 独立 key:与 zustand 的 'toolkit.rest-client' 分开,不参与 bundle schema */
export const LAYOUT_KEY = 'toolkit.rest-client.layout'

/** 响应区展开态的最小高度(px) */
export const MIN_RESPONSE_H = 120
/** 请求区必须保留的高度(px):头部三行 + 至少几行编辑区 */
export const MAX_RESERVE = 160
/** 响应区默认高度(px) */
export const DEFAULT_RESPONSE_H = 320
/** 分隔条键盘步进(px) */
export const RESIZE_STEP = 16

export interface SplitLayout {
  height: number
  collapsed: boolean
}

export const DEFAULT_LAYOUT: SplitLayout = { height: DEFAULT_RESPONSE_H, collapsed: false }

/**
 * 给定主区高度,响应区能取到的最大高度。
 * 容器高度不可测(<=0 / NaN)时返回 Infinity,让调用方跳过上界而不是编造一个。
 */
export function maxResponseHeight(containerHeight: number): number {
  if (!Number.isFinite(containerHeight) || containerHeight <= 0) return Number.POSITIVE_INFINITY
  return Math.max(MIN_RESPONSE_H, Math.round(containerHeight) - MAX_RESERVE)
}

/** 把期望高度夹进 [MIN_RESPONSE_H, maxResponseHeight(containerHeight)];MIN 优先于上界 */
export function clampResponseHeight(desired: number, containerHeight: number): number {
  const want = Number.isFinite(desired) ? Math.round(desired) : DEFAULT_RESPONSE_H
  return Math.min(Math.max(want, MIN_RESPONSE_H), maxResponseHeight(containerHeight))
}

/** 存储值不可信:结构不对/数值越界一律回落默认,绝不抛 */
export function normalizeLayout(raw: unknown): SplitLayout {
  if (typeof raw !== 'object' || raw === null) return DEFAULT_LAYOUT
  const o = raw as { height?: unknown; collapsed?: unknown }
  const height =
    typeof o.height === 'number' && Number.isFinite(o.height)
      ? Math.max(MIN_RESPONSE_H, Math.round(o.height))
      : DEFAULT_RESPONSE_H
  return { height, collapsed: o.collapsed === true }
}

export function readLayout(): SplitLayout {
  return normalizeLayout(storageGet<unknown>(LAYOUT_KEY, null))
}

/** 写失败静默:core/storage 既有约定,布局是会话级 UI 顺位,无用户数据可丢 */
export function writeLayout(layout: SplitLayout): void {
  storageSet(LAYOUT_KEY, layout)
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm vitest run test/rest-client-split-layout.test.ts`
Expected: PASS（14 passed）

- [ ] **Step 5: 门禁**

Run: `pnpm typecheck && pnpm lint`
Expected: 无输出/无 error

- [ ] **Step 6: 提交**

```bash
git add src/renderer/src/tools/rest-api-client/split-layout.ts test/rest-client-split-layout.test.ts
git commit -m "feat(rest-client): add split-layout pure logic for response pane sizing"
```

---

### Task 2: `use-rest-layout.ts` —— 布局记忆 hook

**Files:**
- Create: `src/renderer/src/tools/rest-api-client/use-rest-layout.ts`
- Test: `test/rest-client-use-rest-layout.test.tsx`

**Interfaces:**
- Consumes: Task 1 的 `clampResponseHeight` / `readLayout` / `writeLayout` / `DEFAULT_RESPONSE_H` / `SplitLayout`
- Produces: `useRestLayout(): RestLayout`，其中
  ```ts
  interface RestLayout {
    height: number
    collapsed: boolean
    setHeight: (desired: number, containerHeight: number) => void
    toggle: () => void
    expand: () => void
    reset: () => void
  }
  ```

- [ ] **Step 1: 写失败测试**

Create `test/rest-client-use-rest-layout.test.tsx`:

```tsx
// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useRestLayout } from '@tools/rest-api-client/use-rest-layout'
import { DEFAULT_RESPONSE_H, LAYOUT_KEY, MAX_RESERVE, MIN_RESPONSE_H } from '@tools/rest-api-client/split-layout'
import { useRestStore } from '@tools/rest-api-client/store'

const stored = (): { height: number; collapsed: boolean } =>
  JSON.parse(localStorage.getItem(LAYOUT_KEY) ?? 'null') as { height: number; collapsed: boolean }

beforeEach(() => {
  localStorage.clear()
})

describe('useRestLayout', () => {
  it('初值取自存储', () => {
    localStorage.setItem(LAYOUT_KEY, JSON.stringify({ height: 400, collapsed: true }))
    const { result } = renderHook(() => useRestLayout())
    expect(result.current.height).toBe(400)
    expect(result.current.collapsed).toBe(true)
  })

  it('无存储值时用默认(320 / 未折叠)', () => {
    const { result } = renderHook(() => useRestLayout())
    expect(result.current.height).toBe(DEFAULT_RESPONSE_H)
    expect(result.current.collapsed).toBe(false)
  })

  it('setHeight 夹紧并写回存储', () => {
    const { result } = renderHook(() => useRestLayout())
    act(() => {
      result.current.setHeight(9999, 1000)
    })
    expect(result.current.height).toBe(1000 - MAX_RESERVE)
    expect(stored().height).toBe(1000 - MAX_RESERVE)
  })

  it('setHeight 不低于 MIN_RESPONSE_H', () => {
    const { result } = renderHook(() => useRestLayout())
    act(() => {
      result.current.setHeight(10, 1000)
    })
    expect(result.current.height).toBe(MIN_RESPONSE_H)
  })

  it('setHeight 不改动 collapsed', () => {
    const { result } = renderHook(() => useRestLayout())
    act(() => {
      result.current.toggle()
    })
    act(() => {
      result.current.setHeight(500, 1000)
    })
    expect(result.current.collapsed).toBe(true)
    expect(result.current.height).toBe(500)
  })

  it('toggle 翻转折叠并写回', () => {
    const { result } = renderHook(() => useRestLayout())
    act(() => {
      result.current.toggle()
    })
    expect(result.current.collapsed).toBe(true)
    expect(stored().collapsed).toBe(true)
    act(() => {
      result.current.toggle()
    })
    expect(result.current.collapsed).toBe(false)
  })

  it('expand 保证展开且幂等(已展开时再调不报错)', () => {
    const { result } = renderHook(() => useRestLayout())
    act(() => {
      result.current.toggle()
    })
    expect(result.current.collapsed).toBe(true)
    act(() => {
      result.current.expand()
    })
    expect(result.current.collapsed).toBe(false)
    act(() => {
      result.current.expand()
    })
    expect(result.current.collapsed).toBe(false)
  })

  it('reset 复位高度但保留折叠状态', () => {
    const { result } = renderHook(() => useRestLayout())
    act(() => {
      result.current.toggle()
    })
    act(() => {
      result.current.setHeight(600, 1000)
    })
    act(() => {
      result.current.reset()
    })
    expect(result.current.height).toBe(DEFAULT_RESPONSE_H)
    expect(result.current.collapsed).toBe(true)
  })

  it('存储读取抛错时回落默认、不抛、不点亮「本地存储写入失败」横幅', () => {
    // 必须 spy 在 stub 后的 localStorage 对象上。test/setup.ts 用 vi.stubGlobal 把
    // localStorage 换成普通对象,它不是 Storage 实例 —— spy Storage.prototype 不会生效。
    const spy = vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
      throw new Error('storage blocked')
    })
    useRestStore.setState({ writeFailed: false })
    // 抛错即测试失败,所以「不抛」由这一行本身证明
    const { result } = renderHook(() => useRestLayout())
    expect(result.current.height).toBe(DEFAULT_RESPONSE_H)
    expect(result.current.collapsed).toBe(false)
    // 布局读失败是会话级 UI 顺位问题,不得被误报成集合/环境/历史的存储故障
    expect(useRestStore.getState().writeFailed).toBe(false)
    spy.mockRestore()
  })
})
```

**为什么不用 `Storage.prototype`**：`test/setup.ts` 里 `vi.stubGlobal('localStorage', {...})` 装的是普通对象。spy `Storage.prototype.getItem` 既拦不到它、也不会让它抛错，用例会“通过”但什么都没测。`vi.restoreAllMocks()` 也不会撤 `stubGlobal`（那是 `vi.unstubAllGlobals()`），所以这里显式 `mockRestore()`。

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm vitest run test/rest-client-use-rest-layout.test.tsx`
Expected: FAIL —— 解析不到 `@tools/rest-api-client/use-rest-layout`

- [ ] **Step 3: 写最小实现**

Create `src/renderer/src/tools/rest-api-client/use-rest-layout.ts`:

```ts
import { useCallback, useRef, useState } from 'react'
import {
  DEFAULT_RESPONSE_H,
  clampResponseHeight,
  readLayout,
  writeLayout,
  type SplitLayout
} from './split-layout'

export interface RestLayout {
  height: number
  collapsed: boolean
  setHeight: (desired: number, containerHeight: number) => void
  toggle: () => void
  expand: () => void
  reset: () => void
}

export function useRestLayout(): RestLayout {
  const [layout, setLayout] = useState<SplitLayout>(readLayout)
  // ref 镜像最新值:commit 只依赖 ref,不必把 layout 塞进每个 useCallback 的依赖
  const latest = useRef<SplitLayout>(layout)

  const commit = useCallback((next: SplitLayout): void => {
    latest.current = next
    setLayout(next)
    writeLayout(next)
  }, [])

  const setHeight = useCallback(
    (desired: number, containerHeight: number): void => {
      commit({ ...latest.current, height: clampResponseHeight(desired, containerHeight) })
    },
    [commit]
  )

  const toggle = useCallback((): void => {
    commit({ ...latest.current, collapsed: !latest.current.collapsed })
  }, [commit])

  /** 出错时强制展开:折叠态只能显示标题,失败原因不能被折叠吃掉 */
  const expand = useCallback((): void => {
    if (!latest.current.collapsed) return
    commit({ ...latest.current, collapsed: false })
  }, [commit])

  const reset = useCallback((): void => {
    commit({ ...latest.current, height: DEFAULT_RESPONSE_H })
  }, [commit])

  return { height: layout.height, collapsed: layout.collapsed, setHeight, toggle, expand, reset }
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm vitest run test/rest-client-use-rest-layout.test.tsx`
Expected: PASS（9 passed）

- [ ] **Step 5: 门禁 + 提交**

```bash
pnpm typecheck && pnpm lint
git add src/renderer/src/tools/rest-api-client/use-rest-layout.ts test/rest-client-use-rest-layout.test.tsx
git commit -m "feat(rest-client): add useRestLayout hook for response pane height and collapse state"
```

---

### Task 3: `Splitter.tsx` —— 可拖拽 / 可键盘操作的分隔条

**Files:**
- Create: `src/renderer/src/tools/rest-api-client/components/Splitter.tsx`
- Test: `test/rest-client-splitter.test.tsx`

**Interfaces:**
- Consumes: Task 1 的 `clampResponseHeight` / `maxResponseHeight` / `MIN_RESPONSE_H` / `RESIZE_STEP`
- Produces: `Splitter(props)`，props 为
  ```ts
  interface Props {
    height: number
    containerRef: RefObject<HTMLElement | null>
    onHeightChange: (desired: number, containerHeight: number) => void
    onReset: () => void
  }
  ```
  根元素带 `data-testid="layout-splitter"`。

- [ ] **Step 1: 写失败测试**

Create `test/rest-client-splitter.test.tsx`:

```tsx
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { RefObject } from 'react'
import { Splitter } from '@tools/rest-api-client/components/Splitter'
import { MAX_RESERVE, MIN_RESPONSE_H, RESIZE_STEP } from '@tools/rest-api-client/split-layout'

afterEach(cleanup)

/** jsdom 的 getBoundingClientRect 恒为全 0;要测夹紧就自造一个容器 ref */
function containerOf(height: number): RefObject<HTMLElement | null> {
  const el = document.createElement('div')
  el.getBoundingClientRect = () => ({ height }) as DOMRect
  return { current: el }
}

/** 用真实 MouseEvent 构造 pointer 事件:避免 jsdom 缺 PointerEvent 时的 init 丢失 */
const pointer = (type: string, clientY: number): MouseEvent =>
  new MouseEvent(type, { clientY, bubbles: true })

function setup(opts: { height?: number; containerHeight?: number } = {}) {
  const onHeightChange = vi.fn()
  const onReset = vi.fn()
  render(
    <Splitter
      height={opts.height ?? 320}
      containerRef={containerOf(opts.containerHeight ?? 800)}
      onHeightChange={onHeightChange}
      onReset={onReset}
    />
  )
  return { onHeightChange, onReset, handle: screen.getByTestId('layout-splitter') }
}

describe('Splitter 拖拽', () => {
  it('按下后移动 = 起始高度 + 位移', () => {
    const { onHeightChange, handle } = setup()
    fireEvent(handle, pointer('pointerdown', 100))
    fireEvent(window, pointer('pointermove', 200))
    expect(onHeightChange).toHaveBeenCalledWith(420, 800)
  })

  it('向下拖过界时夹在 容器高 − MAX_RESERVE', () => {
    const { onHeightChange, handle } = setup()
    fireEvent(handle, pointer('pointerdown', 100))
    fireEvent(window, pointer('pointermove', 5000))
    expect(onHeightChange).toHaveBeenCalledWith(800 - MAX_RESERVE, 800)
  })

  it('向上拖过界时不低于 MIN_RESPONSE_H', () => {
    const { onHeightChange, handle } = setup()
    fireEvent(handle, pointer('pointerdown', 100))
    fireEvent(window, pointer('pointermove', -5000))
    expect(onHeightChange).toHaveBeenCalledWith(MIN_RESPONSE_H, 800)
  })

  it('从「实际渲染高度」起算:存储值超界时先夹紧再叠加位移', () => {
    // 存了 900 但容器只有 800 → 实际渲染高度是 640;向上拖 50 → 590(而非 900-50=850)
    const { onHeightChange, handle } = setup({ height: 900, containerHeight: 800 })
    fireEvent(handle, pointer('pointerdown', 100))
    fireEvent(window, pointer('pointermove', 50))
    expect(onHeightChange).toHaveBeenCalledWith(800 - MAX_RESERVE - 50, 800)
  })

  it('pointerup 之后不再响应移动', () => {
    const { onHeightChange, handle } = setup()
    fireEvent(handle, pointer('pointerdown', 100))
    fireEvent(window, pointer('pointerup', 100))
    onHeightChange.mockClear()
    fireEvent(window, pointer('pointermove', 400))
    expect(onHeightChange).not.toHaveBeenCalled()
  })
})

describe('Splitter 其它入口', () => {
  it('双击复位', () => {
    const { onReset, handle } = setup()
    fireEvent.doubleClick(handle)
    expect(onReset).toHaveBeenCalledTimes(1)
  })

  it('↓ 与 ↑ 各步进 RESIZE_STEP', () => {
    const { onHeightChange, handle } = setup()
    fireEvent.keyDown(handle, { key: 'ArrowDown' })
    expect(onHeightChange).toHaveBeenCalledWith(320 + RESIZE_STEP, 800)
    onHeightChange.mockClear()
    fireEvent.keyDown(handle, { key: 'ArrowUp' })
    expect(onHeightChange).toHaveBeenCalledWith(320 - RESIZE_STEP, 800)
  })

  it('无关按键不触发高度变化', () => {
    const { onHeightChange, handle } = setup()
    fireEvent.keyDown(handle, { key: 'a' })
    expect(onHeightChange).not.toHaveBeenCalled()
  })
})

describe('Splitter ARIA', () => {
  it('是可用键盘聚焦的横向分隔条', () => {
    const { handle } = setup()
    expect(handle.getAttribute('role')).toBe('separator')
    expect(handle.getAttribute('aria-orientation')).toBe('horizontal')
    expect(handle.getAttribute('tabindex')).toBe('0')
    expect(handle.getAttribute('aria-valuemin')).toBe(String(MIN_RESPONSE_H))
  })

  it('容器高度可测时给出上界与当前值', () => {
    const { handle } = setup({ height: 500, containerHeight: 800 })
    expect(handle.getAttribute('aria-valuenow')).toBe('500')
    expect(handle.getAttribute('aria-valuemax')).toBe(String(800 - MAX_RESERVE))
  })

  it('容器高度不可测时省略上界(避免 now > max 的非法取值)', () => {
    const { handle } = setup({ height: 500, containerHeight: 0 })
    expect(handle.getAttribute('aria-valuemax')).toBeNull()
    expect(handle.getAttribute('aria-valuenow')).toBe('500')
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm vitest run test/rest-client-splitter.test.tsx`
Expected: FAIL —— 解析不到 `components/Splitter`

- [ ] **Step 3: 写最小实现**

Create `src/renderer/src/tools/rest-api-client/components/Splitter.tsx`:

```tsx
import { useCallback, useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { MIN_RESPONSE_H, RESIZE_STEP, clampResponseHeight, maxResponseHeight } from '../split-layout'

interface Props {
  height: number
  /** 主区容器:拖拽/键盘结果按它的高度夹紧 */
  containerRef: RefObject<HTMLElement | null>
  onHeightChange: (desired: number, containerHeight: number) => void
  onReset: () => void
}

export function Splitter({ height, containerRef, onHeightChange, onReset }: Props): JSX.Element {
  const drag = useRef<{ startY: number; startH: number; containerH: number } | null>(null)
  const [dragging, setDragging] = useState(false)
  const [containerH, setContainerH] = useState(0)

  // 仅在挂载与窗口尺寸变化时量一次,供 ARIA 上界;拖拽/键盘路径各自现量
  useEffect(() => {
    const read = (): void => setContainerH(containerRef.current?.getBoundingClientRect().height ?? 0)
    read()
    window.addEventListener('resize', read)
    return () => window.removeEventListener('resize', read)
  }, [containerRef])

  // 起算点是「实际渲染高度」而非存储值:存储值超界时先夹紧,拖拽才不会从看不见的位置起跳
  const measure = useCallback((): { startH: number; containerH: number } => {
    const h = containerRef.current?.getBoundingClientRect().height ?? 0
    return { startH: clampResponseHeight(height, h), containerH: h }
  }, [containerRef, height])

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>): void => {
    const m = measure()
    drag.current = { startY: e.clientY, startH: m.startH, containerH: m.containerH }
    setDragging(true)
  }

  // window 级监听:指针移出分隔条也能继续拖。不用 setPointerCapture —— jsdom 不实现它
  useEffect(() => {
    if (!dragging) return
    const move = (e: PointerEvent): void => {
      const d = drag.current
      if (!d) return
      onHeightChange(d.startH + (e.clientY - d.startY), d.containerH)
    }
    const stop = (): void => {
      drag.current = null
      setDragging(false)
    }
    // 拖拽期间禁掉文本选择,否则整页会被选中、手感像拖拽失灵
    const prevUserSelect = document.body.style.userSelect
    document.body.style.userSelect = 'none'
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', stop)
    window.addEventListener('pointercancel', stop)
    return () => {
      document.body.style.userSelect = prevUserSelect
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', stop)
      window.removeEventListener('pointercancel', stop)
    }
  }, [dragging, onHeightChange])

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    const delta = e.key === 'ArrowUp' ? -RESIZE_STEP : e.key === 'ArrowDown' ? RESIZE_STEP : 0
    if (delta === 0) return
    e.preventDefault()
    const m = measure()
    onHeightChange(m.startH + delta, m.containerH)
  }

  const max = containerH > 0 ? maxResponseHeight(containerH) : null

  return (
    <div
      data-testid="layout-splitter"
      role="separator"
      aria-orientation="horizontal"
      aria-label="调整响应区高度"
      aria-valuenow={max === null ? height : clampResponseHeight(height, containerH)}
      aria-valuemin={MIN_RESPONSE_H}
      aria-valuemax={max ?? undefined}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onDoubleClick={onReset}
      onKeyDown={onKeyDown}
      className={`h-[3px] shrink-0 cursor-row-resize outline-none transition-colors ${
        dragging ? 'bg-primary' : 'bg-base-300 hover:bg-primary focus-visible:bg-primary'
      }`}
    />
  )
}
```

**为什么是裸 3px 横线、没有抓握图标**：spec §1/§3 把分隔条定为 3px，11px 的 `⋯` 字形塞不进去（会溢出到相邻面板上）。可见性靠 `cursor-row-resize` + hover 变色（`bg-base-300` → `bg-primary`），可达性靠键盘 `↑/↓` 与双击复位——不靠在 3px 里塞一个 glyph。这也是 VS Code / Chrome DevTools 分隔条的做法。

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm vitest run test/rest-client-splitter.test.tsx`
Expected: PASS（11 passed）

- [ ] **Step 5: 门禁 + 提交**

```bash
pnpm typecheck && pnpm lint
git add src/renderer/src/tools/rest-api-client/components/Splitter.tsx test/rest-client-splitter.test.tsx
git commit -m "feat(rest-client): add draggable Splitter with keyboard support and ARIA"
```

---

### Task 4: `Sidebar.tsx` —— ENV 常驻 + 变量可折叠 + 集合/历史页签 + 导入导出收成图标

**Files:**
- Modify: `src/renderer/src/tools/rest-api-client/components/Sidebar.tsx`
- Test: `test/rest-client-sidebar-tabs.test.tsx`（新建）
- Test: `test/rest-client-sidebar.test.tsx:232-242`（第 15 条按行为变更更新）

**Interfaces:**
- Produces（组件对外 props **不变**）：`Sidebar(p: Props)`，与现有 `Props` 定义完全相同。
- 新增 `data-testid`：`sidebar-tab-collections`、`sidebar-tab-history`、`env-vars-toggle`
- 保留全部既有 testid：`new-request-btn`、`env-add-btn`、`env-var-key`、`env-var-value`、`env-var-add-btn`、`env-delete-btn-<id>`、`add-group-btn`、`add-request-btn`、`bundle-export-btn`、`bundle-import-btn`、`bundle-import-input`、`bundle-import-notice`、`group-node-<id>`、`rename-btn-<id>`、`delete-btn-<id>`、`move-select-<id>`

- [ ] **Step 1: 写失败测试**

Create `test/rest-client-sidebar-tabs.test.tsx`:

```tsx
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import RestApiClientPage from '@tools/rest-api-client'
import { useRestStore } from '@tools/rest-api-client/store'

vi.mock('@core/http', () => ({
  httpFetch: vi.fn(async () => ({ ok: true, status: 200, statusText: 'OK', headers: {}, body: '{}', bodyBytes: 2, finalUrl: 'u' })),
  httpCancel: vi.fn()
}))

beforeEach(() => {
  localStorage.clear()
  useRestStore.setState({ collections: [], environments: [], history: [], activeEnvId: '', writeFailed: false })
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('左栏页签', () => {
  it('默认在「集合」页签:集合树可见', () => {
    useRestStore.getState().addGroup('', '用户中心')
    render(<RestApiClientPage />)
    expect(screen.getByTestId('sidebar-tab-collections').getAttribute('aria-selected')).toBe('true')
    expect(screen.getByText('用户中心')).toBeTruthy()
  })

  it('切到「历史」页签:历史条目出现,集合树离开 DOM', () => {
    useRestStore.getState().addGroup('', '用户中心')
    useRestStore.setState({
      history: [
        {
          id: 'h1',
          request: { method: 'GET', url: '/u', headers: [], body: '', truncated: false },
          response: { status: 200, statusText: 'OK', durationMs: 1, sizeBytes: 1, finalUrl: 'u' },
          envName: '',
          at: 1
        }
      ]
    })
    render(<RestApiClientPage />)
    fireEvent.click(screen.getByTestId('sidebar-tab-history'))
    expect(screen.getByTestId('sidebar-tab-history').getAttribute('aria-selected')).toBe('true')
    expect(screen.queryByText('用户中心')).toBeNull()
    expect(screen.getByText('/u')).toBeTruthy()
  })

  it('导入 / 导出在任一页签下都可达', () => {
    render(<RestApiClientPage />)
    expect(screen.getByTestId('bundle-export-btn')).toBeTruthy()
    fireEvent.click(screen.getByTestId('sidebar-tab-history'))
    expect(screen.getByTestId('bundle-export-btn')).toBeTruthy()
    expect(screen.getByTestId('bundle-import-input')).toBeTruthy()
  })
})

describe('变量块折叠', () => {
  it('默认展开:环境变量输入行可见({{var}} 入口不多加一次点击)', () => {
    useRestStore.getState().addEnv('dev')
    render(<RestApiClientPage />)
    expect(screen.getByTestId('env-vars-toggle').getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByTestId('env-var-key')).toBeTruthy()
  })

  it('折叠后输入行离开 DOM,展开后回来', () => {
    useRestStore.getState().addEnv('dev')
    render(<RestApiClientPage />)
    fireEvent.click(screen.getByTestId('env-vars-toggle'))
    expect(screen.getByTestId('env-vars-toggle').getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByTestId('env-var-key')).toBeNull()
    fireEvent.click(screen.getByTestId('env-vars-toggle'))
    expect(screen.getByTestId('env-var-key')).toBeTruthy()
  })

  it('折叠状态只影响变量块,环境列表(重命名/删除)仍在', () => {
    useRestStore.getState().addEnv('dev')
    const eid = useRestStore.getState().environments[0].id
    render(<RestApiClientPage />)
    fireEvent.click(screen.getByTestId('env-vars-toggle'))
    expect(screen.getByTestId(`env-delete-btn-${eid}`)).toBeTruthy()
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm vitest run test/rest-client-sidebar-tabs.test.tsx`
Expected: FAIL —— `Unable to find an element by: [data-testid="sidebar-tab-collections"]`

- [ ] **Step 3: 改 Sidebar.tsx**

在 `Sidebar` 函数顶部（`const [selectedParentId, setSelectedParentId] = useState('')` 那一组 state 旁边）加两个 state：

```tsx
type SidebarTab = 'collections' | 'history'

const [tab, setTab] = useState<SidebarTab>('collections')
const [varsOpen, setVarsOpen] = useState(true)
```

在文件底部（`collectGroups` 之前）加一个页签按钮类名助手：

```tsx
function tabClass(active: boolean): string {
  return `btn btn-xs btn-ghost font-mono ${
    active ? 'border-b-2 border-primary text-base-content' : 'text-neutral'
  }`
}
```

然后**替换 return 的 JSX**，按下述顺序重排（内部块的 JSX 全部**原样搬移**，只有外层容器与所在位置变）：

1. `+ 新建请求` 按钮（`data-testid="new-request-btn"`）—— 原样，保持在最顶。
2. **ENV 行**（新）：把原来的 `<div className="mb-1 font-mono text-[11px] tracking-widest text-neutral">ENV · 环境</div>` + 环境下拉 + `<button data-testid="env-add-btn">` 三件合成一行：
   ```tsx
   <div className="flex items-center gap-2">
     <span className="shrink-0 font-mono text-[11px] tracking-widest text-neutral">ENV</span>
     <select
       className="select select-bordered select-xs min-w-0 flex-1 font-mono"
       value={p.activeEnvId}
       onChange={(e) => p.onSetEnv(e.target.value)}
       aria-label="活动环境"
     >
       <option value="">(无环境)</option>
       {p.environments.map((e) => (
         <option key={e.id} value={e.id}>{e.name}</option>
       ))}
     </select>
     <button data-testid="env-add-btn" className="btn btn-xs btn-ghost shrink-0" onClick={onAddEnv} title="新增环境">+ 环境</button>
   </div>
   ```
   `env-add-btn` 的可见文案**保持 `+ 环境`**：spec 只要求把「导入 / 导出」收成图标按钮，压缩「+ 环境」是计划外扩权。`env-add-btn` 的 testid 与文字都原样保留（`rest-client-sidebar.test.tsx` 第 5、6、8 条按 testid 点击，不受影响）。
3. **环境列表**（原 `Sidebar.tsx:140-173` 的 `<ul>`，含 `env-delete-btn-<id>` 与重命名按钮）—— 原样搬移，**不加折叠**。理由：它是环境切换 UI，且 `rest-client-sidebar.test.tsx` 第 7 条直接点 `env-delete-btn-<id>`，不能藏进折叠块。
4. **变量块**（新容器包住原来的「变量 · 名字」面板）：
   ```tsx
   {activeEnv && (
     <>
       <button
         data-testid="env-vars-toggle"
         aria-expanded={varsOpen}
         className="btn btn-xs btn-ghost w-full justify-start gap-1 font-mono text-neutral"
         onClick={() => setVarsOpen((o) => !o)}
       >
         <span aria-hidden="true">{varsOpen ? '▾' : '▸'}</span>
         变量({Object.keys(activeEnv.vars).length})
       </button>
       {varsOpen && (
         <div className="border border-base-300 bg-base-100/60 p-2">
           {/* 原 Sidebar.tsx:178-214 的内容整块搬进这里(「无变量」提示 / 变量列表 <ul> /
               「新增 key-value」那一行 <div className="mt-1 flex gap-1">),
               env-var-key / env-var-value / env-var-add-btn 三个 testid 原样保留 */}
         </div>
       )}
     </>
   )}
   ```
   注意 `env-var-key` / `env-var-value` / `env-var-add-btn` 三个 testid 原样保留在展开块内。
5. **页签行 + 导入导出**（替换原来的 `COLLECTIONS · 集合` 标题行与后面的 `BUNDLE · 导入 / 导出` 整块）：
   ```tsx
   <div className="flex items-center border-b border-base-300">
     <div role="tablist" aria-label="左栏视图" className="flex items-center gap-3">
       <button data-testid="sidebar-tab-collections" role="tab" aria-selected={tab === 'collections'} className={tabClass(tab === 'collections')} onClick={() => setTab('collections')}>集合</button>
       <button data-testid="sidebar-tab-history" role="tab" aria-selected={tab === 'history'} className={tabClass(tab === 'history')} onClick={() => setTab('history')}>历史</button>
     </div>
     <div className="ml-auto flex items-center gap-1">
       <button data-testid="bundle-export-btn" className="btn btn-xs btn-ghost" title="导出集合与环境为 JSON 文件(含环境变量明文值)" onClick={onBundleExport}>⬆</button>
       <button data-testid="bundle-import-btn" className="btn btn-xs btn-ghost" title="从 JSON 文件导入集合与环境(按 id 合并)" onClick={() => importInputRef.current?.click()}>⬇</button>
       <input
         ref={importInputRef}
         data-testid="bundle-import-input"
         type="file"
         accept="application/json"
         className="hidden"
         onChange={(e) => {
           const f = e.target.files?.[0]
           if (f) void onBundleFile(f)
           e.target.value = ''
         }}
       />
     </div>
   </div>
   {bundleMsg && (
     <div data-testid="bundle-import-notice" className="break-all font-mono text-[11px] text-info">{bundleMsg}</div>
   )}
   ```
6. **页签内容**（新）：
   ```tsx
   <div role="tabpanel" className="min-h-0 flex-1">
     {tab === 'collections' ? (
       <div>
         <div className="mb-1 flex gap-1">
           {/* 原 Sidebar.tsx:221-233 的三个按钮整块搬进这里
               (+ 分组 / + 请求 / 条件渲染的「移至根」),testid 不动 */}
         </div>
         {p.collections.length === 0 && <div className="font-mono text-[11px] text-neutral">暂无集合</div>}
         {p.collections.map((g) => (
           <TreeNode key={g.id} node={g} depth={0} moveTargets={moveTargets} selectedParentId={selectedParentId} onSelectParent={setSelectedParentId} onLoadRequest={p.onLoadRequest} />
         ))}
       </div>
     ) : (
       <>
         {p.history.length === 0 && <div className="font-mono text-[11px] text-neutral">暂无历史</div>}
         {/* 原 Sidebar.tsx:290-308 整个 <ul className="flex flex-col gap-1">…</ul>
             原样搬进这里(含 h.request.truncated && 的「已截断」徽标 —— 第 15 条测试靠它) */}
       </>
     )}
   </div>
   ```
   原来 COLLECTIONS 与 HISTORY 各自那个 `min-h-0 flex-1` 的外层 `<div>` 与 `HISTORY · 历史` 标题行**删掉**（页签本身就承担了标题职责）。

同时把左栏根 `<aside>` 的宽度从 `w-56` 改成 `w-[200px]`，并把 `gap-3` 改为 `gap-2`（纵向更紧凑）。

**`<aside>` 上的 `overflow-auto` 保留不动**：spec §1 要求「左栏继续自管滚动」，即整条左栏滚动。所以页签内容容器只写 `min-h-0 flex-1`、**不要再加 `overflow-auto`**——那会变成嵌套滚动容器，滚轮落在哪一层取决于指针位置，是本次要避免的那类 bug。历史列表靠 `flex-1` 拿到整段高度（spec §4「满高列表」），超出时由 aside 滚动。

- [ ] **Step 4: 更新 `test/rest-client-sidebar.test.tsx` 第 15 条**

历史列表现在默认不在 DOM，需要先点页签。把 `test/rest-client-sidebar.test.tsx:232-242` 替换为：

```tsx
  it('15. 切到「历史」页签后,body 截断条目显示「已截断」徽标(截断可见,不静默)', () => {
    useRestStore.getState().pushHistory({
      id: 'h1',
      request: { method: 'POST', url: '/u', headers: [], body: 'x'.repeat(20000) },
      response: { status: 200, statusText: 'OK', durationMs: 1, sizeBytes: 1, finalUrl: 'u' },
      envName: '',
      at: 1
    })
    render(<RestApiClientPage />)
    fireEvent.click(screen.getByTestId('sidebar-tab-history'))
    expect(screen.getByText('已截断')).toBeTruthy()
  })
```

断言语义不变（截断徽标必须可见），只是补上「历史在页签里」这一步。

- [ ] **Step 5: 跑该组件相关全部测试**

Run: `pnpm vitest run test/rest-client-sidebar.test.tsx test/rest-client-sidebar-tabs.test.tsx`
Expected: PASS（15 + 6 passed）

- [ ] **Step 6: 门禁 + 提交**

```bash
pnpm typecheck && pnpm lint
git add src/renderer/src/tools/rest-api-client/components/Sidebar.tsx test/rest-client-sidebar.test.tsx test/rest-client-sidebar-tabs.test.tsx
git commit -m "feat(rest-client): sidebar tabs for collections/history, sticky env row, collapsible vars"
```

---

### Task 5: `RequestPanel.tsx` —— 四块改页签 + 标题行脏标记

**Files:**
- Modify: `src/renderer/src/tools/rest-api-client/components/RequestPanel.tsx`
- Modify: `src/renderer/src/tools/rest-api-client/index.tsx:186`（传 `dirty`）
- Test: `test/rest-client-request-tabs.test.tsx`（新建）
- Test: `test/rest-client-ui.test.tsx:9`（第 1 条只改标题）

**Interfaces:**
- Consumes: `RequestModel` / `KV` / `Env`（既有）
- Produces: `RequestPanel(p: Props)`，`Props` 在现有基础上**新增一个字段**：
  ```ts
  dirty: boolean
  ```
  其余 props 全部不变。新增 `data-testid`：`request-tab-params`、`request-tab-headers`、`request-tab-body`、`request-tab-curl`、`dirty-marker`。

- [ ] **Step 1: 写失败测试**

Create `test/rest-client-request-tabs.test.tsx`:

```tsx
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import RestApiClientPage from '@tools/rest-api-client'
import { useRestStore } from '@tools/rest-api-client/store'

vi.mock('@core/http', () => ({
  httpFetch: vi.fn(async () => ({ ok: true, status: 200, statusText: 'OK', headers: {}, body: '{}', bodyBytes: 2, finalUrl: 'u' })),
  httpCancel: vi.fn()
}))

// 「另存为副本」用例会往 store 里加集合,不清就会让后续用例看到脏集合
beforeEach(() => {
  localStorage.clear()
  useRestStore.setState({ collections: [], environments: [], history: [], activeEnvId: '', writeFailed: false })
})
afterEach(() => {
  cleanup()
  useRestStore.setState({ writeFailed: false })
})

describe('请求区页签', () => {
  it('默认 Params 页签:query 参数表在 DOM,headers / body / cURL 不在', () => {
    render(<RestApiClientPage />)
    expect(screen.getByTestId('request-tab-params').getAttribute('aria-selected')).toBe('true')
    expect(screen.getByPlaceholderText('新增 key')).toBeTruthy()
    expect(screen.queryByPlaceholderText('Header-Name')).toBeNull()
    expect(screen.queryByPlaceholderText('粘贴浏览器 Copy as cURL (bash / cmd)…')).toBeNull()
  })

  it('切到 Headers:只渲染 headers 内容', () => {
    render(<RestApiClientPage />)
    fireEvent.click(screen.getByTestId('request-tab-headers'))
    expect(screen.getByPlaceholderText('Header-Name')).toBeTruthy()
    expect(screen.queryByPlaceholderText('新增 key')).toBeNull()
  })

  it('切到 Body:只渲染 body 编辑器,且「格式化 JSON」与它在同一屏', () => {
    render(<RestApiClientPage />)
    fireEvent.click(screen.getByTestId('request-tab-body'))
    expect(screen.getByPlaceholderText('{"key":"value"}  支持 {{var}}')).toBeTruthy()
    expect(screen.getByText('格式化 JSON')).toBeTruthy()
    expect(screen.queryByPlaceholderText('Header-Name')).toBeNull()
  })

  it('切到 cURL:粘贴框与「导出 cURL」「解析导入」都在该页签内', () => {
    render(<RestApiClientPage />)
    fireEvent.click(screen.getByTestId('request-tab-curl'))
    expect(screen.getByTestId('curl-import')).toBeTruthy()
    expect(screen.getByTestId('curl-export-btn')).toBeTruthy()
    expect(screen.getByText('解析导入')).toBeTruthy()
    expect(screen.queryByPlaceholderText('新增 key')).toBeNull()
  })

  it('页签计数:headers 有内容时 Headers 页签显示条数', () => {
    render(<RestApiClientPage />)
    fireEvent.click(screen.getByTestId('request-tab-headers'))
    fireEvent.click(screen.getByText('+ Header'))
    expect(screen.getByTestId('request-tab-headers').textContent).toContain('1')
  })

  it('计数为 0 时不显示数字', () => {
    render(<RestApiClientPage />)
    expect(screen.getByTestId('request-tab-params').textContent).toBe('Params')
    expect(screen.getByTestId('request-tab-headers').textContent).toBe('Headers')
  })
})

describe('标题行脏标记', () => {
  it('未改动时没有「未保存」标记', () => {
    render(<RestApiClientPage />)
    expect(screen.queryByTestId('dirty-marker')).toBeNull()
  })

  it('改了 URL 后出现「未保存」', () => {
    render(<RestApiClientPage />)
    fireEvent.change(screen.getByTestId('url-input'), { target: { value: 'https://x/a' } })
    expect(screen.getByTestId('dirty-marker').textContent).toContain('未保存')
  })

  it('「另存为副本」后标记消失(baseline 被重置)', () => {
    render(<RestApiClientPage />)
    fireEvent.change(screen.getByTestId('url-input'), { target: { value: 'https://x/a' } })
    expect(screen.getByTestId('dirty-marker')).toBeTruthy()
    fireEvent.click(screen.getByText('另存为副本'))
    expect(screen.queryByTestId('dirty-marker')).toBeNull()
  })

  it('请求名称仍是可输入控件(带 aria-label)', () => {
    render(<RestApiClientPage />)
    const name = screen.getByLabelText('请求名称') as HTMLInputElement
    fireEvent.change(name, { target: { value: '登录接口' } })
    expect(name.value).toBe('登录接口')
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm vitest run test/rest-client-request-tabs.test.tsx`
Expected: FAIL —— `Unable to find an element by: [data-testid="request-tab-params"]`

- [ ] **Step 3: 改 `index.tsx` 传 `dirty`**

在 `index.tsx:186` 附近（`RequestPanel` 的 props 里，`onSaveCopy` 之后）加一行：

```tsx
            dirty={dirty}
```

- [ ] **Step 4: 改 `RequestPanel.tsx`**

**props**：在 `interface Props` 里加 `dirty: boolean`。

**新增页签 state 与常量**（放在组件顶部 state 区）：

```tsx
type ReqTab = 'params' | 'headers' | 'body' | 'curl'

const [tab, setTab] = useState<ReqTab>('params')

const qCount = params.length
const hCount = p.draft.headers.length
```

文件底部（`reconcileParams` 之前）加：

```tsx
const TAB_LABEL: Record<'params' | 'headers' | 'body' | 'curl', string> = {
  params: 'Params',
  headers: 'Headers',
  body: 'Body',
  curl: 'cURL'
}

function tabClass(active: boolean): string {
  return `btn btn-xs btn-ghost font-mono ${
    active ? 'border-b-2 border-primary text-base-content' : 'text-neutral'
  }`
}
```

**替换 return 的 JSX**，结构改为（内部各块的 JSX **原样搬移**，逻辑一行不改）：

```tsx
  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col">
      {/* 标题行 —— 名称输入框从原 93-99 行搬来,只把 className 从
          `input input-bordered input-sm` 换成无框标题样式,testid/aria-label/onChange 全不动;
          右端「另存为副本」按钮来自原 100-102 行;中间新增 dirty 标记 */}
      <div className="flex items-center gap-2 border-b border-base-300 px-3 py-2">
        <input
          className="min-w-0 flex-1 border-0 bg-transparent font-mono text-[13px] font-bold text-base-content outline-none focus:border-b focus:border-primary"
          placeholder="请求名称"
          value={p.name}
          onChange={(e) => p.onNameChange(e.target.value)}
          aria-label="请求名称"
        />
        {p.dirty && (
          <span data-testid="dirty-marker" className="shrink-0 font-mono text-[11px] text-warning">
            ● 未保存
          </span>
        )}
        <button className="btn btn-xs btn-ghost shrink-0" onClick={p.onSaveCopy} title="将当前草稿另存为集合副本">
          另存为副本
        </button>
      </div>

      {/* URL 行 —— 原 RequestPanel.tsx:105-147 的 method/url/timeout/send 一行原样搬来
          (method-select / url-input / 超时 select / send-btn 与其 testid、onKeyDown 全不动) */}
      <div className="flex gap-2 border-b border-base-300 px-3 py-2">
        {/* …原样… */}
      </div>

      {/* 变量提示行 —— 原 RequestPanel.tsx:149-156 的 hint 两段 JSX 原样搬来,夹在 URL 行与页签行之间 */}
      {/* {hint.undefinedVars.length > 0 ? (…) : hint.resolved !== p.draft.url ? (…) : null} */}

      {/* 页签行 */}
      <div className="flex items-center gap-3 border-b border-base-300 px-3">
        <button data-testid="request-tab-params" role="tab" aria-selected={tab === 'params'} className={tabClass(tab === 'params')} onClick={() => setTab('params')}>
          Params{qCount > 0 ? ` ${qCount}` : ''}
        </button>
        <button data-testid="request-tab-headers" role="tab" aria-selected={tab === 'headers'} className={tabClass(tab === 'headers')} onClick={() => setTab('headers')}>
          Headers{hCount > 0 ? ` ${hCount}` : ''}
        </button>
        <button data-testid="request-tab-body" role="tab" aria-selected={tab === 'body'} className={tabClass(tab === 'body')} onClick={() => setTab('body')}>
          {TAB_LABEL.body}
        </button>
        <button data-testid="request-tab-curl" role="tab" aria-selected={tab === 'curl'} className={tabClass(tab === 'curl')} onClick={() => setTab('curl')}>
          {TAB_LABEL.curl}
        </button>
      </div>

      {/* 页签内容 */}
      <div role="tabpanel" className="min-h-0 flex-1 overflow-auto p-3">
        {tab === 'params' && (
          <div className="border border-base-300 bg-base-200/40 p-3">
            {/* 原 RequestPanel.tsx:158-198 的 QUERY 块整块搬进来(注释 + 外层 div 里
                的标题行 / 无参数提示 / params.map 行 / 新增 key-value 行),一行不改 */}
          </div>
        )}

        {tab === 'headers' && (
          <div className="border border-base-300 bg-base-200/40 p-3">
            {/* 原 RequestPanel.tsx:200-239 的 HEADERS 块整块搬进来
                (含「+ Header」按钮与 headers.map) */}
          </div>
        )}

        {tab === 'body' && (
          <div className="flex h-full flex-col border border-base-300 bg-base-200/40 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-mono text-[11px] tracking-widest text-neutral">BODY · 请求体</span>
              <button className="btn btn-xs btn-ghost" onClick={formatBody}>
                格式化 JSON
              </button>
            </div>
            {formatMsg && <div className="mb-1 font-mono text-[11px] text-error">{formatMsg}</div>}
            <textarea
              className="min-h-0 w-full flex-1 rounded border border-base-300 bg-base-100/60 p-3 font-mono text-[13px] leading-relaxed"
              placeholder='{"key":"value"}  支持 {{var}}'
              value={p.draft.body}
              onChange={(e) => p.onChange({ body: e.target.value })}
              onKeyDown={onKeyDown}
            />
          </div>
        )}

        {tab === 'curl' && (
          <div className="border border-base-300 bg-base-200/40 p-3">
            {/* 原 RequestPanel.tsx:259-285 的 cURL 块整块搬进来
                (含 curl-export-btn / curl-import textarea / 「解析导入」按钮) */}
          </div>
        )}
      </div>
    </section>
  )
```

搬移时的三条硬要求：

1. **`params` 相关的 state 与 `commit` / `editParam` / `removeParam` / `addParam` / `syncedUrlRef` 全部留在组件顶层**，不要跟着 JSX 搬进条件分支——它们是 `useState`/`useRef`，搬进去会改变 hook 调用顺序。`rest-client-ui.test.tsx` 第 4 条守着「编辑 query 参数时输入框不重挂载、焦点保留」，这是本次最容易被碰坏的既有行为。
2. **Body 编辑器去掉写死的 `h-32`**，改为 `min-h-0 flex-1` 吃满页签内容区。
3. **`格式化 JSON` 不放到页签行右端**，留在 Body 内容里与 `formatMsg` 相邻（见 spec §2）。

- [ ] **Step 5: 更新 `test/rest-client-ui.test.tsx` 第 1 条的标题**

`test/rest-client-ui.test.tsx:9` 的用例标题「渲染三栏关键控件」已过时（不再是三栏）。只改标题字符串，**断言一行不动**：

```tsx
  it('渲染请求行与发送控件(上下分栏布局)', () => { render(<RestApiClientPage />); expect(screen.getByTestId('method-select')).toBeTruthy(); expect(screen.getByTestId('send-btn')).toBeTruthy() })
```

- [ ] **Step 6: 跑相关测试**

Run: `pnpm vitest run test/rest-client-request-tabs.test.tsx test/rest-client-ui.test.tsx`
Expected: PASS（10 + 4 passed）

**注意**：`rest-client-ui.test.tsx` 第 4 条依赖 Params 页签默认激活（`getByDisplayValue('1')`）。所以 `tab` 的初值**必须是 `'params'`**，不能是 `'body'`。

- [ ] **Step 7: 门禁 + 提交**

```bash
pnpm typecheck && pnpm lint
git add src/renderer/src/tools/rest-api-client/components/RequestPanel.tsx src/renderer/src/tools/rest-api-client/index.tsx test/rest-client-request-tabs.test.tsx test/rest-client-ui.test.tsx
git commit -m "feat(rest-client): tabbed request sections and unsaved-draft marker in title row"
```

---

### Task 6: `ResponsePanel.tsx` —— 单一头部 + 可折叠

**Files:**
- Modify: `src/renderer/src/tools/rest-api-client/components/ResponsePanel.tsx`
- Test: `test/rest-client-response-panel.test.tsx`（新建）

**Interfaces:**
- Produces: `ResponsePanel(props)`，`Props` 变为
  ```ts
  interface Props {
    response: ResponseModel | null
    error: UiError | null
    sending: boolean
    collapsed: boolean
    onToggle: () => void
    height: number
    onCancel: () => void
  }
  ```
  新增 `data-testid`：`response-panel`、`response-toggle`、`response-body`。
  保留既有 testid：`response-status`。

- [ ] **Step 1: 写失败测试**

Create `test/rest-client-response-panel.test.tsx`:

```tsx
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { ResponsePanel } from '@tools/rest-api-client/components/ResponsePanel'
import type { ResponseModel } from '@tools/rest-api-client/types'

afterEach(cleanup)

const ok: ResponseModel = {
  ok: true,
  status: 200,
  statusText: 'OK',
  headers: { 'content-type': 'application/json' },
  body: '{"a":1}',
  bodyBytes: 7,
  finalUrl: 'https://x/y',
  durationMs: 123,
  undefinedVars: []
}

function renderPanel(over: Partial<ComponentProps<typeof ResponsePanel>> = {}) {
  return render(
    <ResponsePanel
      response={ok}
      error={null}
      sending={false}
      collapsed={false}
      onToggle={() => {}}
      height={320}
      onCancel={() => {}}
      {...over}
    />
  )
}

describe('展开态', () => {
  it('头部有状态徽标,body 容器在 DOM', () => {
    renderPanel()
    expect(screen.getByTestId('response-status').textContent).toContain('200')
    expect(screen.getByTestId('response-body')).toBeTruthy()
    expect(screen.getByTestId('response-toggle').getAttribute('aria-expanded')).toBe('true')
  })

  it('「200」在 DOM 中只出现一次(单一头部,不重复渲染状态)', () => {
    renderPanel()
    expect(screen.getAllByText(/200/)).toHaveLength(1)
  })

  it('保留最终 URL 与深链入口(既有 spec 要求)', () => {
    renderPanel()
    expect(screen.getByText(/https:\/\/x\/y/)).toBeTruthy()
    expect(screen.getByText('用 JSON 解析打开')).toBeTruthy()
    expect(screen.getByText('用 JWT 解析打开')).toBeTruthy()
  })

  it('超过 1MB 的响应仍提示截断且说明复制/深链用全量', () => {
    renderPanel({ response: { ...ok, body: 'x'.repeat(1024 * 1024 + 1) } })
    expect(screen.getByText(/截断预览/)).toBeTruthy()
    expect(screen.getByText(/全量/)).toBeTruthy()
  })
})

describe('折叠态', () => {
  it('body 容器离开 DOM,状态徽标仍在(折叠不等于隐瞒)', () => {
    renderPanel({ collapsed: true })
    expect(screen.queryByTestId('response-body')).toBeNull()
    expect(screen.getByTestId('response-status').textContent).toContain('200')
    expect(screen.getByTestId('response-toggle').getAttribute('aria-expanded')).toBe('false')
  })

  it('失败时折叠也亮明失败', () => {
    renderPanel({ response: null, error: { title: '请求失败', message: 'connect ECONNREFUSED' }, collapsed: true })
    expect(screen.getByText(/请求失败/)).toBeTruthy()
  })

  it('导入失败与请求失败在标题上可区分', () => {
    renderPanel({ response: null, error: { title: '导入失败', message: 'cURL 解析失败:x' }, collapsed: true })
    expect(screen.getByText(/导入失败/)).toBeTruthy()
    expect(screen.queryByText(/请求失败/)).toBeNull()
  })

  it('进行中折叠也显示进行中与取消', () => {
    const onCancel = vi.fn()
    renderPanel({ response: null, sending: true, collapsed: true, onCancel })
    expect(screen.getByText(/请求进行中/)).toBeTruthy()
    fireEvent.click(screen.getByText('取消'))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('未发送过给出操作提示', () => {
    renderPanel({ response: null })
    expect(screen.getByText(/Ctrl\+Enter/)).toBeTruthy()
  })
})

describe('切换', () => {
  it('点头部切换按钮触发 onToggle', () => {
    const onToggle = vi.fn()
    renderPanel({ onToggle })
    fireEvent.click(screen.getByTestId('response-toggle'))
    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  it('折叠时不写死 height,展开时用传入高度', () => {
    const { unmount } = renderPanel({ collapsed: true, height: 320 })
    expect(screen.getByTestId('response-panel').getAttribute('style')).toBeNull()
    unmount()
    renderPanel({ height: 320 })
    expect(screen.getByTestId('response-panel').getAttribute('style')).toContain('320px')
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm vitest run test/rest-client-response-panel.test.tsx`
Expected: FAIL —— `Unable to find an element by: [data-testid="response-panel"]`

- [ ] **Step 3: 重写 `ResponsePanel.tsx`**

把四个 early-return 分支合并成「**一个 section + 一个头部 + 条件 body**」。核心代码：

```tsx
import { MAX_RESERVE, MIN_RESPONSE_H } from '../split-layout'

return (
  <section
    data-testid="response-panel"
    className="flex shrink-0 flex-col overflow-hidden border-t border-base-300 bg-base-200/40"
    style={
      collapsed
        ? undefined
        : { height, minHeight: MIN_RESPONSE_H, maxHeight: `calc(100% - ${MAX_RESERVE}px)` }
    }
  >
    <div className="flex flex-wrap items-center gap-2 px-3 py-2">
      <button
        data-testid="response-toggle"
        className="btn btn-xs btn-ghost gap-1 px-1 font-mono"
        aria-expanded={!collapsed}
        onClick={onToggle}
      >
        <span aria-hidden="true">{collapsed ? '▸' : '▾'}</span>
        返回响应
      </button>

      {sending ? (
        <span className="font-mono text-sm text-warning">◐ 请求进行中…</span>
      ) : error ? (
        <span role="alert" className="font-mono text-sm text-error">✕ {error.title}</span>
      ) : response ? (
        <>
          <span data-testid="response-status" className={`badge badge-lg font-mono font-bold ${statusColor(response.status)}`}>
            {response.status} {response.statusText}
          </span>
          <span className="font-mono text-[11px] text-neutral">{response.durationMs} ms</span>
          <span className="font-mono text-[11px] text-neutral">{formatBytes(response.bodyBytes)}</span>
        </>
      ) : (
        <span className="font-mono text-[11px] text-neutral">填好请求,点发送或 Ctrl+Enter</span>
      )}

      <div className="ml-auto flex items-center gap-2">
        {sending && (
          <button className="btn btn-xs btn-ghost" onClick={onCancel}>取消</button>
        )}
        {!sending && response && (
          <CopyButton getText={() => response.body} enabled={response.body !== ''} />
        )}
      </div>
    </div>

    {!collapsed && (
      <div data-testid="response-body" className="flex min-h-0 flex-1 flex-col">
        {/* 错误详情 */}
        {error && <div className="px-3 pb-2 text-sm">{error.message}</div>}

        {/* 成功态:finalUrl / 未替换变量 / 截断提示 / notice / headers 折叠 / body / 深链按钮
            —— 原来的 JSX 原样搬进这里,只把最外层 body 容器的
            `min-h-0 flex-1 overflow-auto p-3` 保留 */}
      </div>
    )}
  </section>
)
```

要点：

1. **状态文本只在头部出现一次**。原来的 `sending` / `error` / `empty` 三个 early-return 整段删掉，它们的展示统一进头部。
2. **`error.message` 放 body**，头部只放 `error.title`。折叠时详情不可见——这正是 index.tsx 要在出错时调 `expand()` 的原因（Task 7）。
3. 原 `ResponsePanel.tsx:114-167` **整段搬进 `response-body` 内**，即：`finalUrl` 行(114-118)、`undefinedVars` 提示(120-124)、`truncated` 提示(126-130)、`notice`(132-134)、`<details>` headers 折叠(136-149)、body 预览/`JsonView`(151-160)、底部两个深链按钮行(162-167)。连同它们依赖的 `body` / `size` / `truncated` / `preview` / `ct` / `isJson` / `jsonValue` 计算(48-56 行)与 `selected` / `goto` / `openJson` / `openJwt` 四个闭包(58-97 行)一起留在组件体内 —— 它们只在展开态被用到，但都是普通常量与函数，不需要挪位置。
4. `safeParse` / `statusColor` / `formatBytes` 三个文件底部辅助函数不动。
5. 最外层 `border` 由四边改为 `border-t`（现在它贴在分隔条下方，左右和底部由主区容器负责）。
6. **头部右端动作只放 `CopyButton`，两个深链按钮留在展开态底部动作行**。spec §3 的括号里把「深链按钮」一并算作头部动作，但 §6 的兼容性核查更具体地钉住了「`用 JSON 解析打开` / `用 JWT 解析打开` 保留在展开态底部动作行」——按更具体的那条执行（也让这两个按钮与它们产出的 `notice` 提示行同屏相邻）。

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm vitest run test/rest-client-response-panel.test.tsx`
Expected: PASS（11 passed）

- [ ] **Step 5: 门禁 + 提交**

```bash
pnpm typecheck && pnpm lint
git add src/renderer/src/tools/rest-api-client/components/ResponsePanel.tsx test/rest-client-response-panel.test.tsx
git commit -m "feat(rest-client): single response header with collapse, status stays visible when folded"
```

---

### Task 7: `index.tsx` —— 上下分栏接线 + 失败自动展开

**Files:**
- Modify: `src/renderer/src/tools/rest-api-client/index.tsx`
- Test: `test/rest-client-ui.test.tsx`（追加）

**Interfaces:**
- Consumes: Task 2 `useRestLayout`、Task 3 `Splitter`、Task 5 `RequestPanel`（新增 `dirty`）、Task 6 `ResponsePanel`（新增 4 个 props）
- Produces: 带 `data-testid="layout-splitter"` 的完整页面

- [ ] **Step 1: 写失败测试**

在 `test/rest-client-ui.test.tsx` 末尾（`describe` 块内）追加。先把顶部导入与 `afterEach` 那一行改成：

```tsx
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, fireEvent, screen, cleanup } from '@testing-library/react'
import type { Mock } from 'vitest'
import { httpFetch } from '@core/http'
import RestApiClientPage from '@tools/rest-api-client'
import { useRestStore } from '@tools/rest-api-client/store'
import { LAYOUT_KEY } from '@tools/rest-api-client/split-layout'
```

```tsx
// 必须清 localStorage：布局 hook 会把 collapsed/height 写进 toolkit.rest-client.layout,
// 否则「折叠」用例的 folded 状态会漏给后面的用例（下一条初值就不是展开态了）。
beforeEach(() => {
  localStorage.clear()
  useRestStore.setState({ collections: [], environments: [], history: [], activeEnvId: '', writeFailed: false })
})
afterEach(() => { cleanup(); useRestStore.setState({ writeFailed: false }) })
```

追加的用例：

```tsx
  it('上下分栏:分隔条在 DOM', () => {
    render(<RestApiClientPage />)
    expect(screen.getByTestId('layout-splitter')).toBeTruthy()
  })

  it('折叠响应区后 body 容器离开 DOM,状态仍在', async () => {
    render(<RestApiClientPage />)
    fireEvent.change(screen.getByTestId('url-input'), { target: { value: 'https://x/a' } })
    fireEvent.keyDown(screen.getByTestId('url-input'), { key: 'Enter', ctrlKey: true })
    await screen.findByTestId('response-status')
    fireEvent.click(screen.getByTestId('response-toggle'))
    expect(screen.queryByTestId('response-body')).toBeNull()
    expect(screen.getByTestId('response-status')).toBeTruthy()
  })

  it('失败自动展开:折叠状态下发一个失败请求 → 响应区展开且失败可见', async () => {
    ;(httpFetch as unknown as Mock).mockRejectedValueOnce(new Error('boom'))
    render(<RestApiClientPage />)
    fireEvent.change(screen.getByTestId('url-input'), { target: { value: 'https://x/a' } })
    fireEvent.click(screen.getByTestId('response-toggle'))
    expect(screen.getByTestId('response-toggle').getAttribute('aria-expanded')).toBe('false')
    fireEvent.keyDown(screen.getByTestId('url-input'), { key: 'Enter', ctrlKey: true })
    await screen.findByText(/请求失败/)
    expect(screen.getByTestId('response-toggle').getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByTestId('response-body')).toBeTruthy()
  })

  it('布局记忆:折叠状态写进独立 key,不混入 zustand 的 toolkit.rest-client', async () => {
    render(<RestApiClientPage />)
    fireEvent.click(screen.getByTestId('response-toggle'))
    expect(JSON.parse(localStorage.getItem(LAYOUT_KEY) ?? 'null').collapsed).toBe(true)
    const persisted = JSON.parse(localStorage.getItem('toolkit.rest-client') ?? '{}') as Record<string, unknown>
    expect(persisted).not.toHaveProperty('collapsed')
    expect(persisted).not.toHaveProperty('height')
  })

  it('布局读失败:回落默认布局、不抛、不点亮「本地存储写入失败」横幅', async () => {
    // 只让布局那个 key 抛错,其余 key 走原实现 —— 避免打断 zustand persist 的 rehydrate
    const real = localStorage.getItem.bind(localStorage)
    const spy = vi.spyOn(localStorage, 'getItem').mockImplementation((k: string) => {
      if (k === LAYOUT_KEY) throw new Error('storage blocked')
      return real(k)
    })
    render(<RestApiClientPage />)
    expect(screen.getByTestId('layout-splitter')).toBeTruthy()
    expect(screen.queryByText(/本地存储写入失败/)).toBeNull()
    spy.mockRestore()
  })
```

注意第 4 条与第 5 条都**不能**用 `vi.spyOn(Storage.prototype, 'getItem')`：`test/setup.ts` 用 `vi.stubGlobal` 把 `localStorage` 换成了普通对象，spy `Storage.prototype` 拦不到它。

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm vitest run test/rest-client-ui.test.tsx`
Expected: FAIL —— `Unable to find an element by: [data-testid="layout-splitter"]`

- [ ] **Step 3: 改 `index.tsx`**

**导入**（顶部**只加两行**，放在 `ResponsePanel` 那行之后）：

```tsx
import { Splitter } from './components/Splitter'
import { useRestLayout } from './use-rest-layout'
```

`useRef` 已在第 1 行的 `import { useCallback, useEffect, useRef, useState } from 'react'` 里，**不要再加一行 `import { useRef } from 'react'`**——重复导入会直接被 `pnpm lint` 拦下。

**组件内新增**（放在 `const [error, setError] = useState<UiError | null>(null)` 之后）：

```tsx
  const { height, collapsed, setHeight, toggle, expand, reset } = useRestLayout()
  const mainRef = useRef<HTMLDivElement>(null)
```

**失败时自动展开**：在 `send()` 的错误分支里，`setError({ title: '请求失败', message: res.message })` 之后加一行 `expand()`：

```tsx
      } else {
        setResponse(null)
        setError({ title: '请求失败', message: res.message })
        expand()
      }
```

并在 `send` 的 `useCallback` 依赖数组里补 `expand`：

```tsx
  }, [draft, env, sending, timeoutSec, pushHistory, expand])
```

同样，在 `onImportCurl` 的失败分支里加 `expand()`：

```tsx
      } else {
        // 粘贴解析失败 ≠ 请求失败:标题区分,不把导入错误伪装成请求错误
        setError({ title: '导入失败', message: `cURL 解析失败:${r.message}` })
        setResponse(null)
        expand()
      }
```

并把 `onImportCurl` 的依赖数组补上 `expand`。

**替换 return 的 JSX**（`index.tsx:157-202`）：把 `flex min-w-0 flex-1 gap-3 overflow-auto p-4` 那层换成上下分栏：

```tsx
  return (
    <div className="flex h-full min-h-0 flex-col">
      {writeFailed && (
        <div role="alert" className="border-b border-warning bg-warning/15 px-4 py-2 font-mono text-sm text-warning">
          ⚠ 本地存储写入失败,本次修改仅存于会话
        </div>
      )}
      <div className="flex min-h-0 flex-1">
        <Sidebar
          environments={environments}
          activeEnvId={activeEnvId}
          onSetEnv={setActiveEnv}
          collections={collections}
          onLoadRequest={onLoadRequest}
          history={history}
          onHistoryLoad={onHistoryLoad}
          onNewRequest={onNewRequest}
        />
        <div ref={mainRef} className="flex min-h-0 min-w-0 flex-1 flex-col">
          <RequestPanel
            draft={draft}
            onChange={patch}
            timeoutSec={timeoutSec}
            onTimeoutChange={setTimeoutSec}
            env={env}
            sending={sending}
            onSend={send}
            onImportCurl={onImportCurl}
            onExportCurl={onExportCurl}
            name={name}
            onNameChange={setName}
            onSaveCopy={onSaveCopy}
            dirty={dirty}
          />
          {!collapsed && (
            <Splitter
              height={height}
              containerRef={mainRef}
              onHeightChange={setHeight}
              onReset={reset}
            />
          )}
          <ResponsePanel
            response={response}
            error={error}
            sending={sending}
            collapsed={collapsed}
            onToggle={toggle}
            height={height}
            onCancel={() => {
              cancelCurrent()
              setSending(false)
            }}
          />
        </div>
      </div>
    </div>
  )
```

**删掉**原来包住两个面板的 `<div className="flex min-w-0 flex-1 gap-3 overflow-auto p-4">`。那个 `overflow-auto` 会让整页滚动、与固定上下分栏冲突；`p-4` 去掉后分栏贴边。

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm vitest run test/rest-client-ui.test.tsx`
Expected: PASS（9 passed = 原有 4 条 + 追加 5 条）

- [ ] **Step 5: 跑全量测试 + 门禁**

Run: `pnpm test && pnpm typecheck && pnpm lint`
Expected: 全绿。既有全部用例 + 本计划新增 66 条（14 + 9 + 11 + 6 + 10 + 11 + 5），0 failure。

- [ ] **Step 6: 提交**

```bash
git add src/renderer/src/tools/rest-api-client/index.tsx test/rest-client-ui.test.tsx
git commit -m "feat(rest-client): split request/response vertically with collapsible response pane"
```

---

### Task 8: 集成验收（单测覆盖不到的部分）

**Files:**
- 无代码改动；若发现缺陷，回到对应 Task 修并补测试

**说明**：spec §验收 里有三条只能靠真实运行判断——三种主题下结构一致、拖拽手感、以及「折叠着发失败请求」的真实观感。这一条任务把它们跑一遍。

- [ ] **Step 1: 启动应用**

Run: `pnpm dev:web`
然后打开输出的本地地址，进 REST 客户端。

- [ ] **Step 2: 走一遍主链路**

依次确认：

1. 粘一段浏览器 Copy as cURL → cURL 页签 →「解析导入」→ 页签自动回到 Params？**不会自动切页签**（本计划未做该行为）；确认导入结果可见（参数进 Params、body 进 Body）。
2. 切 Params / Headers / Body / cURL 四个页签，每个页签的内容都吃满剩余高度、内部可滚动，**没有整页滚动条**。
3. 发送一个真实请求 → 响应区出现、状态徽标/耗时/体积齐全。
4. 拖动分隔条：请求区始终留得住（不低于约 160px），响应区不低于 120px；双击复位到 320px。**拖动时整页不应出现文本选中**。
   分隔条是 3px 细线（spec §1/§3 定死），单看几乎看不见：鼠标移到两区交界处光标应变成 `row-resize`、横线变 primary 色——这才是它的发现方式，不是 bug。
5. 折叠响应区 → 请求区吃满，头部那行仍显示状态。刷新页面 → 折叠状态与高度被记住。
6. **折叠状态下发一个必定失败的请求**（把 URL 改成 `https://localhost:1/none`）→ 响应区应自动展开并亮明 `✕ 请求失败`。
7. 左栏切「集合」「历史」页签；环境变量块可折叠；导出/导入按钮在任一页签下都能点到。
8. 改一下 URL → 标题行出现 `● 未保存`；点「另存为副本」→ 标记消失。
9. 载入集合里的请求 → 有未保存改动时应弹丢弃确认（既有行为）。

- [ ] **Step 3: 三种主题各看一遍**

用应用内主题切换依次看 深色 / 纸白 / 焦糖：结构一致、只有颜色变化；页签激活态是 primary 下划线；**没有新增任何颜色**。

- [ ] **Step 4: 窄窗口检查**

把窗口压到很矮（约 500px 高）再拖分隔条：确认请求区没有被压没，响应区停在 120px（JS 的 `MIN_RESPONSE_H` 与 CSS 的 `min-h` 同向，MIN 优先于上界）。

- [ ] **Step 5: 记录结果**

若全部通过，本计划完成，进入全分支 review。若发现缺陷，回到对应 Task 修复 + 补测试 + 重跑该 Task 的门禁。

---

## 附：本计划的全局不变式（每个 Task 自查）

1. **不改数据流**：`store.ts` / `http-client.ts` / `curl-parse.ts` / `curl-build.ts` / `env-resolve.ts` / `query-params.ts` / `deep-link.ts` 一行不动。
2. **不改存储 schema**：`partialize` 白名单、`BUNDLE_VERSION`、`exportBundle` 的字段集合都不动。
3. **状态文本在响应区只出现一次**（单一头部）。
4. **折叠不删状态**：折叠态仍显示状态码/耗时/体积；出错时自动展开。
5. **既有 testid 一个不少**。
6. **`params` 编辑器的焦点保持行为不被破坏**（`rest-client-ui.test.tsx` 第 4 条是这次改版最容易被碰坏的既有行为）。
