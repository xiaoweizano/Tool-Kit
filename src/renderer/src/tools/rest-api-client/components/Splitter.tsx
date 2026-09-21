import { useCallback, useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { MIN_RESPONSE_H, RESIZE_STEP, clampResponseHeight, maxResponseHeight } from '../split-layout'

interface Props {
  height: number
  /** 主区容器:拖拽/键盘结果按它的高度夹紧 */
  containerRef: RefObject<HTMLElement | null>
  onHeightChange: (desired: number, containerHeight: number) => void
  /** 交回容器高度,复位时才能按当前容器夹紧(矮容器不该硬套默认 320) */
  onReset: (containerHeight: number) => void
}

export function Splitter({ height, containerRef, onHeightChange, onReset }: Props): JSX.Element {
  const drag = useRef<{ startY: number; startH: number; containerH: number } | null>(null)
  const [dragging, setDragging] = useState(false)
  const [containerH, setContainerH] = useState(0)

  // 仅在挂载与窗口尺寸变化时量一次,供 ARIA 上界;拖拽/键盘路径各自现量
  useEffect(() => {
    const read = (): void => setContainerH(containerRef.current?.getBoundingClientRect().height ?? 0)
    read()
    window.addEventListener('resize', read)
    return () => window.removeEventListener('resize', read)
  }, [containerRef])

  // 起算点是「实际渲染高度」而非存储值:存储值超界时先夹紧,拖拽才不会从看不见的位置起跳
  const measure = useCallback((): { startH: number; containerH: number } => {
    const h = containerRef.current?.getBoundingClientRect().height ?? 0
    return { startH: clampResponseHeight(height, h), containerH: h }
  }, [containerRef, height])

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>): void => {
    const m = measure()
    drag.current = { startY: e.clientY, startH: m.startH, containerH: m.containerH }
    setDragging(true)
  }

  // window 级监听:指针移出分隔条也能继续拖。不用 setPointerCapture —— jsdom 不实现它
  useEffect(() => {
    if (!dragging) return
    const move = (e: PointerEvent): void => {
      const d = drag.current
      if (!d) return
      onHeightChange(clampResponseHeight(d.startH + (e.clientY - d.startY), d.containerH), d.containerH)
    }
    const stop = (): void => {
      drag.current = null
      setDragging(false)
    }
    // 拖拽期间禁掉文本选择,否则整页会被选中、手感像拖拽失灵
    const prevUserSelect = document.body.style.userSelect
    document.body.style.userSelect = 'none'
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', stop)
    window.addEventListener('pointercancel', stop)
    return () => {
      document.body.style.userSelect = prevUserSelect
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', stop)
      window.removeEventListener('pointercancel', stop)
    }
  }, [dragging, onHeightChange])

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    const delta = e.key === 'ArrowUp' ? -RESIZE_STEP : e.key === 'ArrowDown' ? RESIZE_STEP : 0
    if (delta === 0) return
    e.preventDefault()
    const m = measure()
    onHeightChange(m.startH + delta, m.containerH)
  }

  const max = containerH > 0 ? maxResponseHeight(containerH) : null

  return (
    <div
      data-testid="layout-splitter"
      role="separator"
      aria-orientation="horizontal"
      aria-label="调整响应区高度"
      aria-valuenow={max === null ? height : clampResponseHeight(height, containerH)}
      aria-valuemin={MIN_RESPONSE_H}
      aria-valuemax={max ?? undefined}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onDoubleClick={() => onReset(measure().containerH)}
      onKeyDown={onKeyDown}
      className={`h-[3px] shrink-0 touch-none cursor-row-resize outline-none transition-colors ${
        dragging ? 'bg-primary' : 'bg-base-300 hover:bg-primary focus-visible:bg-primary'
      }`}
    />
  )
}
