import { useCallback, useEffect, useRef, useState } from 'react'
import type { ToolResult } from './types'
import { runTransform } from './transform.channel'

/**
 * 多输入工具共享 hook:页面维护对象 input 的若干 string 字段,
 * setField 合并字段并 150ms 防抖;empty(input) 全空时进入 idle,否则直通 worker。
 * 与 useLiveTransform 不同,它接受对象输入且由调用方自定义空态判断。
 */
export function useMultiFieldTransform<I, O>(
  toolId: string,
  empty: (input: I) => boolean
): {
  input: I
  setField: (patch: Partial<I>) => void
  phase: 'idle' | 'running' | 'done'
  result: ToolResult<O> | null
} {
  const [input, setInput] = useState({} as I)
  const [phase, setPhase] = useState<'idle' | 'running' | 'done'>('idle')
  const [result, setResult] = useState<ToolResult<O> | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>()
  const seq = useRef(0)
  const latest = useRef({} as I)

  const run = useCallback((v: I) => {
    const mine = ++seq.current
    if (empty(v)) { setResult(null); setPhase('idle'); return }
    setPhase('running')
    void runTransform(toolId, v, {})
      .then((r) => { if (mine === seq.current) { setResult(r as ToolResult<O>); setPhase('done') } })
      .catch(() => {
        if (mine === seq.current) {
          setResult({ status: 'error', kind: 'unsupported', structure: 'transform-channel', message: '转换通道异常,请重试' } as ToolResult<O>)
          setPhase('done')
        }
      })
  }, [toolId, empty])

  const setField = useCallback((patch: Partial<I>) => {
    const next = { ...(latest.current ?? {}), ...patch } as I
    latest.current = next
    setInput(next)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => run(next), 150)
  }, [run])

  useEffect(() => () => clearTimeout(timer.current), [])
  return { input, setField, phase, result }
}
