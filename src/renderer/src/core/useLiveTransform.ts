import { useCallback, useEffect, useRef, useState } from 'react'
import type { ToolResult, TransformOpts } from './types'
import { runTransform } from './transform.channel'

export function useLiveTransform<I, O>(toolId: string) {
  const [input, setInputRaw] = useState<I>('' as unknown as I)
  const [opts, setOpts] = useState<TransformOpts>({})
  const [phase, setPhase] = useState<'idle' | 'running' | 'done'>('idle')
  const [result, setResult] = useState<ToolResult<O> | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>()
  const seq = useRef(0)

  const run = useCallback((v: I, o: TransformOpts) => {
    const mine = ++seq.current
    if (String(v) === '') { setResult(null); setPhase('idle'); return }
    setPhase('running')
    void runTransform(toolId, v, o).then((r) => {
      if (mine === seq.current) { setResult(r as ToolResult<O>); setPhase('done') }
    })
  }, [toolId])

  const setInput = useCallback((v: I) => {
    setInputRaw(v)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => run(v, opts), 150)
  }, [opts, run])

  // opts 变化立即重跑(input 经防抖,由 setInput 调度)
  useEffect(() => { run(input, opts) }, [opts, run])
  useEffect(() => () => clearTimeout(timer.current), [])
  return { input, setInput, opts, setOpts, phase, result }
}
