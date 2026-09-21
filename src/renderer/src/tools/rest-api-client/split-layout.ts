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
