import { useCallback, useRef, useState } from 'react'
import {
  DEFAULT_RESPONSE_H,
  clampResponseHeight,
  readLayout,
  writeLayout,
  type SplitLayout
} from './split-layout'

export interface RestLayout {
  height: number
  collapsed: boolean
  setHeight: (desired: number, containerHeight: number) => void
  toggle: () => void
  expand: () => void
  reset: () => void
}

export function useRestLayout(): RestLayout {
  const [layout, setLayout] = useState<SplitLayout>(readLayout)
  // ref 镜像最新值:commit 只依赖 ref,不必把 layout 塞进每个 useCallback 的依赖
  const latest = useRef<SplitLayout>(layout)

  const commit = useCallback((next: SplitLayout): void => {
    latest.current = next
    setLayout(next)
    writeLayout(next)
  }, [])

  const setHeight = useCallback(
    (desired: number, containerHeight: number): void => {
      commit({ ...latest.current, height: clampResponseHeight(desired, containerHeight) })
    },
    [commit]
  )

  const toggle = useCallback((): void => {
    commit({ ...latest.current, collapsed: !latest.current.collapsed })
  }, [commit])

  /** 出错时强制展开:折叠态只能显示标题,失败原因不能被折叠吃掉 */
  const expand = useCallback((): void => {
    if (!latest.current.collapsed) return
    commit({ ...latest.current, collapsed: false })
  }, [commit])

  const reset = useCallback((): void => {
    commit({ ...latest.current, height: DEFAULT_RESPONSE_H })
  }, [commit])

  return { height: layout.height, collapsed: layout.collapsed, setHeight, toggle, expand, reset }
}
