import { useState } from 'react'
import { useMultiFieldTransform } from '@core/useMultiFieldTransform'
import { CopyButton } from '@components/CopyButton'
import { TriStateOutput } from '@components/TriStateOutput'
import { REGEX_LIBRARY, highlightSegments } from './transform'

interface RegexInput { pattern: string; flags: string; text: string }

const isEmpty = (input: RegexInput): boolean => !input.pattern.trim() && !input.text.trim()

export default function RegexGeneratorPage(): JSX.Element {
  const [pattern, setPattern] = useState('')
  const [flags, setFlags] = useState('g')
  const [text, setText] = useState('')
  const { setField, phase, result } = useMultiFieldTransform<RegexInput, string>('regex-generator', isEmpty)

  const onPattern = (v: string): void => { setPattern(v); setField({ pattern: v }) }
  const onFlags = (v: string): void => { setFlags(v); setField({ flags: v }) }
  const onText = (v: string): void => { setText(v); setField({ text: v }) }
  const applyTemplate = (id: string): void => {
    const t = REGEX_LIBRARY.find((x) => x.id === id)
    if (!t) return
    const f = t.flags.includes('g') ? t.flags : t.flags + 'g'
    setPattern(t.pattern); setFlags(f); setText(t.example)
    setField({ pattern: t.pattern, flags: f, text: t.example })
  }
  const current = REGEX_LIBRARY.find((t) => t.pattern === pattern)
  const segments = pattern.trim() && text ? highlightSegments(pattern, flags, text).segments : []

  return (
    <div className="mx-auto max-w-5xl p-6">
      <header className="mb-4 flex items-baseline gap-3">
        <h1 className="text-2xl font-bold">正则生成/测试</h1>
        <span className="font-mono text-[11px] tracking-[0.25em] text-neutral">REGEX · MATCH · EXPLAIN</span>
        <CopyButton getText={() => (result?.status === 'ok' ? result.data : '')} enabled={phase === 'done' && result?.status === 'ok'} />
      </header>
      <div className="grid grid-cols-[13rem_1fr] gap-4 max-lg:grid-cols-1">
        <aside className="border border-base-300 bg-base-200/40">
          <span className="ml-3 -mt-2 inline-block bg-base-100 px-1 font-mono text-[11px] tracking-widest text-neutral">模板库 · {REGEX_LIBRARY.length}</span>
          <ul className="max-h-[26rem] overflow-y-auto py-2">
            {REGEX_LIBRARY.map((t) => (
              <li key={t.id}>
                <button className="w-full px-4 py-1.5 text-left text-sm hover:bg-base-200" onClick={() => applyTemplate(t.id)}>{t.name}</button>
              </li>
            ))}
          </ul>
        </aside>
        <div className="min-w-0">
          <section className="border border-base-300 bg-base-200/40">
            <span className="ml-3 -mt-2 inline-block bg-base-100 px-1 font-mono text-[11px] tracking-widest text-neutral">PATTERN · 正则</span>
            <div className="flex items-center gap-2 p-3">
              <input className="input input-bordered input-sm w-full font-mono text-[13px]" placeholder="输入或从左侧模板选择…" value={pattern} onChange={(e) => onPattern(e.target.value)} />
              <input className="input input-bordered input-sm w-20 font-mono" title="flags: g i m s 等" value={flags} onChange={(e) => onFlags(e.target.value)} />
            </div>
          </section>
          {current && (
            <p className="mt-2 font-mono text-[11px] text-neutral">「{current.name}」 {current.desc} · 示例已填入</p>
          )}
          <section className="mt-3 border border-base-300 bg-base-200/40">
            <span className="ml-3 -mt-2 inline-block bg-base-100 px-1 font-mono text-[11px] tracking-widest text-neutral">TEXT · 测试文本</span>
            <textarea className="h-32 w-full resize-none border-0 bg-transparent p-4 font-mono text-[13px] leading-relaxed outline-none" placeholder="粘贴测试文本,匹配片段即刻点亮…" value={text} onChange={(e) => onText(e.target.value)} />
          </section>
          {segments.length > 0 && (
            <section className="mt-3 border border-base-300 bg-base-200/40 p-4 font-mono text-[13px] leading-relaxed whitespace-pre-wrap break-all">
              {segments.map((s, i) => (
                <span key={i} className={s.matched ? 'rounded bg-success/25 text-success' : ''}>{s.text}</span>
              ))}
            </section>
          )}
          <div className="mt-4">
            <TriStateOutput result={result} phase={phase} emptyHint="输入正则与测试文本(或点左侧模板),匹配结果即刻点亮…" />
          </div>
        </div>
      </div>
    </div>
  )
}

export { RegexGeneratorPage }
