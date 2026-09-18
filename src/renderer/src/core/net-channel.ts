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
  if (name === 'AbortError') return new NetFetchError('aborted', message)
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
