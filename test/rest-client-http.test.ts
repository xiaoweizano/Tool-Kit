import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as hc from '@tools/rest-api-client/http-client'
import * as http from '@core/http'
import { NetFetchError } from '@core/net-channel'
vi.mock('@core/http')
// 注意:vitest 2.1 在 beforeEach 里对 automock 的 async fn 调用 mockReset()/mockClear(),
// 会把上一用例 mockRejectedValue 的 rejection 误报为 unhandled rejection(与业务代码无关)。
// 改用 restoreAllMocks 既隔离用例状态又不触发该 phantom。
beforeEach(() => vi.restoreAllMocks())
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
  it('header/body 变量解析并透传给 httpFetch', async () => {
    vi.mocked(http.httpFetch).mockResolvedValue({ ok: true, status: 200, statusText: 'OK', headers: {}, body: '', bodyBytes: 0, finalUrl: 'u' })
    const r = await hc.sendRequest(
      { method: 'POST', url: 'u', headers: [{ id: '1', key: 'Authorization', value: 'Bearer {{token}}' }, { id: '2', key: '', value: 'x' }], body: '{"q":"{{query}}"}' } as never,
      { id: 'e', name: 'dev', vars: { token: 'abc', query: 'hi' } } as never,
      { timeoutMs: 15000 }
    )
    expect(r.status).toBe('ok')
    const [, init] = vi.mocked(http.httpFetch).mock.calls[0]
    expect(init?.method).toBe('POST')
    expect(init?.headers).toEqual({ Authorization: 'Bearer abc' })
    expect(init?.body).toBe('{"q":"hi"}')
  })
  it('空 body 透传为 undefined', async () => {
    vi.mocked(http.httpFetch).mockResolvedValue({ ok: true, status: 200, statusText: 'OK', headers: {}, body: '', bodyBytes: 0, finalUrl: 'u' })
    await hc.sendRequest({ method: 'GET', url: 'u', headers: [], body: '' } as never, undefined as never, { timeoutMs: 15000 })
    expect(vi.mocked(http.httpFetch).mock.calls[0][1]?.body).toBeUndefined()
  })
  it('network 类错误映射为桌面版提示文案', async () => {
    vi.mocked(http.httpFetch).mockRejectedValue(new NetFetchError('network', 'Failed to fetch'))
    const r = await hc.sendRequest(req as never, undefined as never, { timeoutMs: 15000 })
    expect(r.status).toBe('error'); if (r.status === 'error') expect(r.message).toContain('桌面版不受此限制')
  })
})

describe('cancelCurrent', () => {
  it('有在途请求时调用 httpCancel(当前 requestId)', async () => {
    vi.mocked(http.httpCancel).mockClear()
    let captured: ((v: unknown) => void) | undefined
    vi.mocked(http.httpFetch).mockImplementation(() => new Promise((_res, rej) => { captured = rej as never; void _res }))
    const pending = hc.sendRequest({ method: 'GET', url: 'u', headers: [], body: '' } as never, undefined as never, { timeoutMs: 15000 })
    await Promise.resolve()
    hc.cancelCurrent()
    expect(vi.mocked(http.httpCancel)).toHaveBeenCalledTimes(1)
    const sentId = vi.mocked(http.httpCancel).mock.calls[0][0]
    expect(typeof sentId).toBe('string'); expect(sentId.length).toBeGreaterThan(0)
    // 请求体内部捕获的 id 与取消 id 一致:断言透传的是同一 requestId
    const fetchId = vi.mocked(http.httpFetch).mock.calls[0][2]?.requestId
    expect(sentId).toBe(fetchId)
    captured?.(new NetFetchError('aborted', 'aborted'))
    await pending
  })
  it('无在途请求时不调用 httpCancel', () => {
    vi.mocked(http.httpCancel).mockClear()
    hc.cancelCurrent()
    expect(vi.mocked(http.httpCancel)).not.toHaveBeenCalled()
  })
})
