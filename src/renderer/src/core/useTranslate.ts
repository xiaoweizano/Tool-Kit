import { useRef, useState } from 'react'
import type { ToolResult } from './types'
import { httpFetch } from './http'
import { ENGINES, parseEngineResponse, EngineParseError, MAX_LINE_LEN } from '@tools/translate/transform'
import { getKeys } from './translate-keys'

export interface TranslateArgs { text: string; from: string; to: string; engine: string }

export function useTranslate(): {
  phase: 'idle' | 'running' | 'done'
  result: ToolResult<string> | null
  translate(a: TranslateArgs): void
} {
  const [phase, setPhase] = useState<'idle' | 'running' | 'done'>('idle')
  const [result, setResult] = useState<ToolResult<string> | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>()
  const seq = useRef(0)

  const translate = (a: TranslateArgs): void => {
    clearTimeout(timer.current)
    if (!a.text.trim()) { setResult(null); setPhase('idle'); return }
    setPhase('running')
    timer.current = setTimeout(() => void run(a), 500)
  }

  const run = async (a: TranslateArgs): Promise<void> => {
    const mine = ++seq.current
    // 行号按过滤前原始行计(含空行)以便定位:保留空行占位,翻译时跳过
    const rawLines = a.text.split('\n')
    for (let i = 0; i < rawLines.length; i++) {
      if (rawLines[i].trim().length > MAX_LINE_LEN) {
        if (mine === seq.current) {
          setResult({ status: 'error', kind: 'invalid-input', message: `第 ${i + 1} 行超过 ${MAX_LINE_LEN} 字符,请拆行后重试` })
          setPhase('done')
        }
        return
      }
    }
    const engine = ENGINES[a.engine] ?? ENGINES.mymemory
    const keys = getKeys()[engine.id] ?? {}
    const jobs = rawLines.map(async (line, i) => {
      const t = line.trim()
      if (t === '') return ''
      try {
        const req = await engine.buildRequest(t, a.from, a.to, keys)
        const res = await httpFetch(req.url, req.init as never)
        if (!res.ok) throw new EngineParseError(`HTTP ${res.status}`)
        return parseEngineResponse(engine.id, JSON.parse(res.body))
      } catch (e) {
        throw new EngineParseError(`第 ${i + 1} 行翻译失败:${(e as Error).message}`)
      }
    })
    const settled = await Promise.allSettled(jobs)
    if (mine !== seq.current) return
    const out: string[] = []
    let failed = 0
    for (const s of settled) {
      if (s.status === 'fulfilled') out.push(s.value)
      else { failed++; out.push(`【${s.reason instanceof EngineParseError ? s.reason.message : '翻译失败'}】`) }
    }
    if (failed === settled.length && failed > 0) {
      const first = settled.find((s) => s.status === 'rejected') as PromiseRejectedResult
      setResult({ status: 'error', kind: 'engine', message: first.reason instanceof Error ? first.reason.message : '翻译失败' })
    } else {
      setResult({ status: 'ok', data: out.join('\n') })
    }
    setPhase('done')
  }

  return { phase, result, translate }
}
