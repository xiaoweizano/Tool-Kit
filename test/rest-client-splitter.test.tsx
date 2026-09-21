// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { RefObject } from 'react'
import { Splitter } from '@tools/rest-api-client/components/Splitter'
import { MAX_RESERVE, MIN_RESPONSE_H, RESIZE_STEP } from '@tools/rest-api-client/split-layout'

afterEach(cleanup)

/** jsdom 的 getBoundingClientRect 恒为全 0;要测夹紧就自造一个容器 ref */
function containerOf(height: number): RefObject<HTMLElement | null> {
  const el = document.createElement('div')
  el.getBoundingClientRect = () => ({ height }) as DOMRect
  return { current: el }
}

/** 用真实 MouseEvent 构造 pointer 事件:避免 jsdom 缺 PointerEvent 时的 init 丢失 */
const pointer = (type: string, clientY: number): MouseEvent =>
  new MouseEvent(type, { clientY, bubbles: true })

function setup(opts: { height?: number; containerHeight?: number } = {}) {
  const onHeightChange = vi.fn()
  const onReset = vi.fn()
  render(
    <Splitter
      height={opts.height ?? 320}
      containerRef={containerOf(opts.containerHeight ?? 800)}
      onHeightChange={onHeightChange}
      onReset={onReset}
    />
  )
  return { onHeightChange, onReset, handle: screen.getByTestId('layout-splitter') }
}

describe('Splitter 拖拽', () => {
  it('按下后移动 = 起始高度 + 位移', () => {
    const { onHeightChange, handle } = setup()
    fireEvent(handle, pointer('pointerdown', 100))
    fireEvent(window, pointer('pointermove', 200))
    expect(onHeightChange).toHaveBeenCalledWith(420, 800)
  })

  it('向下拖过界时夹在 容器高 − MAX_RESERVE', () => {
    const { onHeightChange, handle } = setup()
    fireEvent(handle, pointer('pointerdown', 100))
    fireEvent(window, pointer('pointermove', 5000))
    expect(onHeightChange).toHaveBeenCalledWith(800 - MAX_RESERVE, 800)
  })

  it('向上拖过界时不低于 MIN_RESPONSE_H', () => {
    const { onHeightChange, handle } = setup()
    fireEvent(handle, pointer('pointerdown', 100))
    fireEvent(window, pointer('pointermove', -5000))
    expect(onHeightChange).toHaveBeenCalledWith(MIN_RESPONSE_H, 800)
  })

  it('从「实际渲染高度」起算:存储值超界时先夹紧再叠加位移', () => {
    // 存了 900 但容器只有 800 → 实际渲染高度是 640;向上拖 50 → 590(而非 900-50=850)
    const { onHeightChange, handle } = setup({ height: 900, containerHeight: 800 })
    fireEvent(handle, pointer('pointerdown', 100))
    fireEvent(window, pointer('pointermove', 50))
    expect(onHeightChange).toHaveBeenCalledWith(800 - MAX_RESERVE - 50, 800)
  })

  it('pointerup 之后不再响应移动', () => {
    const { onHeightChange, handle } = setup()
    fireEvent(handle, pointer('pointerdown', 100))
    fireEvent(window, pointer('pointerup', 100))
    onHeightChange.mockClear()
    fireEvent(window, pointer('pointermove', 400))
    expect(onHeightChange).not.toHaveBeenCalled()
  })
})

describe('Splitter 其它入口', () => {
  it('双击复位', () => {
    const { onReset, handle } = setup()
    fireEvent.doubleClick(handle)
    expect(onReset).toHaveBeenCalledTimes(1)
  })

  it('↓ 与 ↑ 各步进 RESIZE_STEP', () => {
    const { onHeightChange, handle } = setup()
    fireEvent.keyDown(handle, { key: 'ArrowDown' })
    expect(onHeightChange).toHaveBeenCalledWith(320 + RESIZE_STEP, 800)
    onHeightChange.mockClear()
    fireEvent.keyDown(handle, { key: 'ArrowUp' })
    expect(onHeightChange).toHaveBeenCalledWith(320 - RESIZE_STEP, 800)
  })

  it('无关按键不触发高度变化', () => {
    const { onHeightChange, handle } = setup()
    fireEvent.keyDown(handle, { key: 'a' })
    expect(onHeightChange).not.toHaveBeenCalled()
  })
})

describe('Splitter ARIA', () => {
  it('是可用键盘聚焦的横向分隔条', () => {
    const { handle } = setup()
    expect(handle.getAttribute('role')).toBe('separator')
    expect(handle.getAttribute('aria-orientation')).toBe('horizontal')
    expect(handle.getAttribute('tabindex')).toBe('0')
    expect(handle.getAttribute('aria-valuemin')).toBe(String(MIN_RESPONSE_H))
  })

  it('容器高度可测时给出上界与当前值', () => {
    const { handle } = setup({ height: 500, containerHeight: 800 })
    expect(handle.getAttribute('aria-valuenow')).toBe('500')
    expect(handle.getAttribute('aria-valuemax')).toBe(String(800 - MAX_RESERVE))
  })

  it('容器高度不可测时省略上界(避免 now > max 的非法取值)', () => {
    const { handle } = setup({ height: 500, containerHeight: 0 })
    expect(handle.getAttribute('aria-valuemax')).toBeNull()
    expect(handle.getAttribute('aria-valuenow')).toBe('500')
  })
})
