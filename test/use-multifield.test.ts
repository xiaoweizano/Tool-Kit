// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useMultiFieldTransform } from '@core/useMultiFieldTransform'

vi.mock('@core/transform.channel', () => ({
  runTransform: async (_id: string, input: { a: string; b: string }) =>
    `${input.a}|${input.b}` === 'x|'
      ? { status: 'ok', data: input.a.toUpperCase() }
      : { status: 'error', kind: 'invalid-input', message: '缺字段', position: 0 }
}))

describe('useMultiFieldTransform', () => {
  beforeEach(() => { vi.useRealTimers() })
  it('两字段空白 → idle 且无 result', () => {
    const { result } = renderHook(() => useMultiFieldTransform<{ a: string; b: string }, string>('t', (i) => !i.a && !i.b))
    expect(result.current.result).toBeNull()
    expect(result.current.phase).toBe('idle')
  })
  it('setField 防抖后触发转换', async () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useMultiFieldTransform<{ a: string; b: string }, string>('t', (i) => !i.a && !i.b))
    act(() => result.current.setField({ a: 'x', b: '' }))
    await act(async () => { vi.advanceTimersByTime(200) })
    expect(result.current.result?.status).toBe('ok')
    result.current.setField({ b: 'y' }) // 与 mock 的 'x|' 不符 → 错
    await act(async () => { vi.advanceTimersByTime(200) })
    expect(result.current.result?.status).toBe('error')
    vi.useRealTimers()
  })
})
