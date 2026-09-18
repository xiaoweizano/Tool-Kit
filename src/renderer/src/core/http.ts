import { classifyFetchError, computeBodyBytes, normalizeHeaders, NetFetchError, DEFAULT_TIMEOUT_MS } from './net-channel'
import type { NetFetchInit, NetFetchExtra, NetFetchOk } from './net-channel'

interface MainResult { ok: boolean; status: number; statusText?: string; headers?: Record<string, string>; body?: string; bodyBytes?: number; finalUrl?: string; kind?: string; message?: string }
interface TkAPI {
  netFetch?: (p: { url: string; requestId?: string; timeoutMs?: number; init?: NetFetchInit }) => Promise<MainResult>
  netCancel?: (requestId: string) => void
}
const webAborts = new Map<string, AbortController>()

// 渲染进程 globalThis 即 window;测试/Node 下无 window 时回退到 globalThis 避免 ReferenceError
function tkApi(): TkAPI | undefined {
  const g = (typeof window !== 'undefined' ? window : globalThis) as unknown as { toolkitAPI?: TkAPI }
  return g.toolkitAPI
}

export async function httpFetch(url: string, init?: NetFetchInit, extra?: NetFetchExtra): Promise<NetFetchOk> {
  const timeoutMs = extra?.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const api = tkApi()
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
  tkApi()?.netCancel?.(requestId)
}
