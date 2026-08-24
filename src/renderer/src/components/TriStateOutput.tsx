import { useEffect, useMemo, useRef, useState } from 'react'
import type { ToolResult } from '@core/types'
import { highlightLine } from './highlight'
import { CopyButton } from './CopyButton'

interface Props {
  result: ToolResult<string> | null
  phase: 'idle' | 'running' | 'done'
  emptyHint: string
  onRetry?: () => void
}
const LINE_H = 22

export function TriStateOutput({ result, phase, emptyHint }: Props): JSX.Element {
  const scroller = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [viewH, setViewH] = useState(320)

  useEffect(() => {
    const el = scroller.current
    if (!el) return
    const ro = new ResizeObserver(() => setViewH(el.clientHeight))
    ro.observe(el); setViewH(el.clientHeight)
    return () => ro.disconnect()
  }, [])

  const lines = useMemo(() => (result?.status === 'ok' ? result.data.split('\n') : []), [result])
  const first = Math.max(0, Math.floor(scrollTop / LINE_H) - 5)
  const count = Math.ceil(viewH / LINE_H) + 10
  const slice = lines.slice(first, first + count)

  if (phase === 'running') {
    return <div className="border border-base-300 bg-base-200 p-4 font-mono text-sm text-warning">◐ 处理中…</div>
  }
  if (!result) {
    return <div className="border border-base-300 bg-base-200/50 p-6 text-center text-sm text-neutral">{emptyHint}</div>
  }
  if (result.status === 'error') {
    const where = 'position' in result && typeof result.position === 'number'
      ? `(${result.position} 号字符附近)` : 'failedItems' in result && result.failedItems
        ? `(失败行:${result.failedItems.join(', ')})` : ''
    return (
      <div role="alert" className="border border-error/60 bg-base-200 p-4 font-mono text-sm">
        <span className="text-error">✕ ERROR · {result.kind === 'invalid-input' ? '输入无效' : result.kind === 'partial' ? '部分失败' : `不支持:${result.structure}`}</span>
        <p className="mt-1 text-base-content">{result.message} <span className="text-neutral">{where}</span></p>
      </div>
    )
  }
  return (
    <div className="relative border border-base-300 bg-base-200">
      <div className="absolute right-3 top-3 z-10"><CopyButton getText={() => result.data} enabled /></div>
      <div ref={scroller} className="max-h-80 overflow-auto p-4 font-mono text-[13px] leading-[22px]"
        onScroll={(e) => setScrollTop((e.target as HTMLDivElement).scrollTop)}>
        <div style={{ height: lines.length * LINE_H, position: 'relative' }}>
          <div style={{ transform: `translateY(${first * LINE_H}px)` }}>
            {slice.map((ln, i) => (
              <div key={first + i} style={{ height: LINE_H }}
                dangerouslySetInnerHTML={{ __html: highlightLine(ln, 'json') || '&nbsp;' }} />
            ))}
          </div>
        </div>
      </div>
      <div className="border-t border-base-300 px-4 py-1 font-mono text-[11px] text-neutral">
        {lines.length} 行 · {result.data.length} 字符
      </div>
    </div>
  )
}
