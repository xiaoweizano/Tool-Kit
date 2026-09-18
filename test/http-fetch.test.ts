import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { httpFetch, httpCancel } from '@core/http'
import { NetFetchError } from '@core/net-channel'

beforeEach(() => { vi.restoreAllMocks() })
afterEach(() => { delete (globalThis as { toolkitAPI?: unknown }).toolkitAPI })

describe('httpFetch (web path)', () => {
  it('成功返回 headers/bodyBytes/finalUrl', async () => {
    const resp = new Response('hi', {
      status: 201, statusText: 'Created', headers: { 'content-length': '2', 'x-a': 'b' }
    })
    // Response 构造器不携带 url(浏览器仅在真实重定向后填充),此处模拟最终 URL
    Object.defineProperty(resp, 'url', { value: 'http://final' })
    vi.stubGlobal('fetch', vi.fn(async () => resp))
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
  it('手动取消 → aborted(不误判为 timeout)', async () => {
    vi.stubGlobal('fetch', vi.fn((_u: string, init: { signal: AbortSignal }) =>
      new Promise((_res, rej) => {
        init.signal.addEventListener('abort', () => rej(Object.assign(new Error('aborted'), { name: 'AbortError' })))
      })))
    const p = httpFetch('http://x', undefined, { requestId: 'req-cancel', timeoutMs: 15000 })
    httpCancel('req-cancel')
    await expect(p).rejects.toMatchObject({ kind: 'aborted' })
  })
})
