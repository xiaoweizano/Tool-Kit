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
