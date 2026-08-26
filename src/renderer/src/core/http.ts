// HTTP 适配器:桌面走 toolkitAPI.netFetch(Electron net,无 CORS);Web 走浏览器 fetch;统一 15s 超时
interface NetFetchResult { ok: boolean; status: number; body: string }
interface TkAPI { netFetch?: (p: { url: string; init?: { method?: string; headers?: Record<string, string>; body?: string } }) => Promise<NetFetchResult> }

export const FETCH_TIMEOUT_MS = 15000

export async function httpFetch(url: string, init?: { method?: string; headers?: Record<string, string>; body?: string }): Promise<NetFetchResult> {
  const api = (window as { toolkitAPI?: TkAPI }).toolkitAPI
  if (api?.netFetch) return api.netFetch({ url, init })
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal })
    return { ok: res.ok, status: res.status, body: await res.text() }
  } finally {
    clearTimeout(timer)
  }
}
