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
      result.current.reset(800)
    })
    expect(result.current.height).toBe(DEFAULT_RESPONSE_H)
    expect(result.current.collapsed).toBe(true)
  })

  it('reset 在矮容器上被夹紧(而非硬套默认 320)', () => {
    const { result } = renderHook(() => useRestLayout())
    act(() => {
      result.current.reset(400)
    })
    // 400 − MAX_RESERVE = 240,低于默认 320;不夹紧就会越过 MAX_RESERVE 挤掉请求区
    expect(result.current.height).toBe(400 - MAX_RESERVE)
    expect(stored().height).toBe(400 - MAX_RESERVE)
  })

  it('toggle 折叠/展开都保留高度(不会顺手复位)', () => {
    const { result } = renderHook(() => useRestLayout())
    act(() => {
      result.current.setHeight(500, 800)
    })
    expect(result.current.height).toBe(500)
    act(() => {
      result.current.toggle()
    })
    expect(result.current.collapsed).toBe(true)
    expect(result.current.height).toBe(500)
    act(() => {
      result.current.toggle()
    })
    expect(result.current.collapsed).toBe(false)
    expect(result.current.height).toBe(500)
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
