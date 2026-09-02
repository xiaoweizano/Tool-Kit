import { useState } from 'react'
import { useMultiFieldTransform } from '@core/useMultiFieldTransform'
import { CopyButton } from '@components/CopyButton'
import { TriStateOutput } from '@components/TriStateOutput'
import type { DiffInput, DiffMode } from './types'

const MODES: { id: DiffMode; label: string }[] = [
  { id: 'line', label: '逐行' },
  { id: 'word', label: '逐词' },
  { id: 'char', label: '逐字符' }
]
const isEmpty = (i: DiffInput): boolean => !(i.textA ?? '').length && !(i.textB ?? '').length

export default function TextDiffPage(): JSX.Element {
  const [mode, setMode] = useState<DiffMode>('line')
  const { setField, phase, result } = useMultiFieldTransform<DiffInput, string>('text-diff', isEmpty)
  return (
    <div className="mx-auto max-w-4xl p-6">
      <header className="mb-4 flex items-baseline gap-3">
        <h1 className="text-2xl font-bold">文本对比</h1>
        <span className="font-mono text-[11px] tracking-[0.25em] text-neutral">DIFF · HIGHLIGHT</span>
        <CopyButton getText={() => (result?.status === 'ok' ? result.data : '')} enabled={result?.status === 'ok'} />
      </header>
      <div className="mb-3 flex gap-2">
        {MODES.map((m) => (
          <button
            key={m.id}
            className={`btn btn-sm ${mode === m.id ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => { setMode(m.id); setField({ mode: m.id }) }}
          >
            {m.label}
          </button>
        ))}
      </div>
      <section className="border border-base-300 bg-base-200/40 p-4">
        <div className="grid gap-3 md:grid-cols-2">
          <textarea placeholder="原文本 A" onChange={(e) => setField({ textA: e.target.value })} className="textarea textarea-bordered w-full font-mono" rows={8} />
          <textarea placeholder="对比文本 B" onChange={(e) => setField({ textB: e.target.value })} className="textarea textarea-bordered w-full font-mono" rows={8} />
        </div>
      </section>
      <div className="mt-4">
        {result?.status === 'ok' ? (
          <div className="rounded border border-base-300 bg-base-100 p-4" dangerouslySetInnerHTML={{ __html: result.data }} />
        ) : <TriStateOutput result={result} phase={phase} emptyHint="输入两侧文本开始对比…" />}
      </div>
    </div>
  )
}
