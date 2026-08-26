import { useState } from 'react'
import { CopyButton } from '@components/CopyButton'
import { TriStateOutput } from '@components/TriStateOutput'
import { useTranslate } from '@core/useTranslate'
import { LANGUAGES, AUTO, ENGINES } from './transform'

const isDesktop = typeof window !== 'undefined' && !!(window as { toolkitAPI?: unknown }).toolkitAPI

export default function TranslatePage(): JSX.Element {
  const [text, setText] = useState('')
  const [from, setFrom] = useState(AUTO)
  const [to, setTo] = useState('en')
  const [engine, setEngine] = useState('mymemory')
  const { phase, result, translate } = useTranslate()

  const go = (): void => translate({ text, from, to, engine })

  return (
    <div className="mx-auto max-w-4xl p-6">
      <header className="mb-4 flex items-baseline gap-3">
        <h1 className="text-2xl font-bold">翻译</h1>
        <span className="font-mono text-[11px] tracking-[0.25em] text-neutral">TRANSLATE · MULTI-LANG</span>
        <span className="ml-auto font-mono text-[11px] text-warning">NET</span>
        <CopyButton getText={() => (result?.status === 'ok' ? result.data : '')} enabled={phase === 'done' && result?.status === 'ok'} />
      </header>
      <section className="border border-base-300 bg-base-200/40">
        <span className="ml-3 -mt-2 inline-block bg-base-100 px-1 font-mono text-[11px] tracking-widest text-neutral">INPUT · 多行文本(逐行翻译)</span>
        <textarea className="h-36 w-full resize-none border-0 bg-transparent p-4 font-mono text-[13px] leading-relaxed outline-none"
          placeholder="粘贴文本,每行一句,点「翻译」…" value={text} onChange={(e) => setText(e.target.value)} />
      </section>
      <div className="flex flex-wrap items-center gap-3 py-3" role="toolbar">
        <label className="flex items-center gap-2 whitespace-nowrap text-sm text-neutral">源语言
          <select className="select select-bordered select-sm font-mono" value={from} onChange={(e) => setFrom(e.target.value)}>
            <option value={AUTO}>自动检测</option>
            {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2 whitespace-nowrap text-sm text-neutral">目标
          <select className="select select-bordered select-sm font-mono" value={to} onChange={(e) => setTo(e.target.value)}>
            {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2 whitespace-nowrap text-sm text-neutral">引擎
          <select className="select select-bordered select-sm font-mono" value={engine} onChange={(e) => setEngine(e.target.value)}>
            {Object.values(ENGINES).map((e) => (
              <option key={e.id} value={e.id} disabled={!e.browserOk && !isDesktop}>
                {e.label}{!e.browserOk && !isDesktop ? '(仅桌面版)' : ''}
              </option>
            ))}
          </select>
        </label>
        <button className="btn btn-sm btn-primary ml-auto" onClick={go}>翻译</button>
      </div>
      <TriStateOutput result={result} phase={phase} emptyHint="粘贴多行文本,选择语言与引擎,点「翻译」…(需联网)" />
    </div>
  )
}

export { TranslatePage }
