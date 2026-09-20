// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTranslate } from '@core/useTranslate'

// 契约对齐:httpFetch 传输失败是 throw(NetFetchError),HTTP 4xx/5xx 才是返回值(ok 恒为 true);
// mock 必须以 reject 模拟传输失败,green-testing {ok:false} 会放过真实错误路径
vi.mock('@core/http', async () => {
  const { NetFetchError } = await import('@core/net-channel')
  return {
    httpFetch: async (url: string) => {
      if (url.includes('slow')) await new Promise(() => undefined as never) // 永不返回,测超时
      if (url.includes('fail')) throw new NetFetchError('network', 'Failed to fetch')
      const q = /q=([^&]+)/.exec(url)?.[1] ?? ''
      return { ok: true, status: 200, body: JSON.stringify({ responseStatus: 200, responseData: { translatedText: `T:${decodeURIComponent(q)}` } }) }
    }
  }
})

describe('useTranslate', () => {
  beforeEach(() => vi.useRealTimers())
  it('多行按行序收集(Promise.all)', async () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useTranslate())
    act(() => result.current.translate({ text: 'a\nb\nc', from: 'auto', to: 'zh-CN', engine: 'mymemory' }))
    await act(async () => { vi.advanceTimersByTime(700) })
    expect(result.current.result?.status).toBe('ok')
    if (result.current.result?.status === 'ok') {
      expect(result.current.result.data.split('\n')).toEqual(['T:a', 'T:b', 'T:c'])
    }
    vi.useRealTimers()
  })
  it('单行失败仅标记该行', async () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useTranslate())
    act(() => result.current.translate({ text: 'a\nfail\nb', from: 'auto', to: 'zh-CN', engine: 'mymemory' }))
    await act(async () => { vi.advanceTimersByTime(700) })
    if (result.current.result?.status === 'ok') {
      const lines = result.current.result.data.split('\n')
      expect(lines[0]).toBe('T:a')
      expect(lines[1]).toContain('第 2 行翻译失败')
      expect(lines[2]).toBe('T:b')
    }
    vi.useRealTimers()
  })
  it('全部行失败 → error ToolResult', async () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useTranslate())
    act(() => result.current.translate({ text: 'fail\nfail', from: 'auto', to: 'zh-CN', engine: 'mymemory' }))
    await act(async () => { vi.advanceTimersByTime(700) })
    expect(result.current.result?.status).toBe('error')
    vi.useRealTimers()
  })
  it('超长行(>450)报错并定位行号', async () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useTranslate())
    const long = 'x'.repeat(451)
    act(() => result.current.translate({ text: `a\n${long}`, from: 'auto', to: 'zh-CN', engine: 'mymemory' }))
    await act(async () => { vi.advanceTimersByTime(700) })
    expect(result.current.result?.status).toBe('error')
    if (result.current.result?.status === 'error') expect(result.current.result.message).toContain('第 2 行')
    vi.useRealTimers()
  })
  it('空文本 → idle', () => {
    const { result } = renderHook(() => useTranslate())
    act(() => result.current.translate({ text: '  ', from: 'auto', to: 'zh-CN', engine: 'mymemory' }))
    expect(result.current.phase).toBe('idle')
    expect(result.current.result).toBeNull()
  })
})
