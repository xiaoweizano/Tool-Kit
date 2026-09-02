import { useState } from 'react'
import { useLiveTransform } from '@core/useLiveTransform'
import { CopyButton } from '@components/CopyButton'
import { TriStateOutput } from '@components/TriStateOutput'
import type { BaseConvResult } from './types'

const FIELDS: { key: keyof BaseConvResult; label: string }[] = [
  { key: 'bin', label: '二进制' },
  { key: 'oct', label: '八进制' },
  { key: 'dec', label: '十进制' },
  { key: 'hex', label: '十六进制' }
]
const SOURCES = ['2', '8', '10', '16']

export default function BaseConverterPage(): JSX.Element {
  const { input, setInput, setOpts, phase, result } = useLiveTransform<string, BaseConvResult>('base-converter')
  const [src, setSrc] = useState('10')
  return (
    <div className="mx-auto max-w-4xl p-6">
      <header className="mb-4 flex items-baseline gap-3">
        <h1 className="text-2xl font-bold">进制转换</h1>
        <span className="font-mono text-[11px] tracking-[0.25em] text-neutral">2 · 8 · 10 · 16</span>
      </header>
      <section className="border border-base-300 bg-base-200/40 p-4">
        <div className="flex items-center gap-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入数字(支持 0x/0b/0o 前缀)"
            className="input input-bordered input-sm flex-1 font-mono"
          />
          <label className="text-sm text-neutral">源进制
            <select
              className="select select-bordered select-sm ml-1"
              value={src}
              onChange={(e) => { setSrc(e.target.value); setOpts({ source: e.target.value }) }}
            >
              {SOURCES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>
        </div>
      </section>
      <div className="mt-4">
        {result?.status === 'ok' ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {FIELDS.map((f) => (
              <div key={f.key} className="rounded border border-base-300 bg-base-200/40 p-3">
                <div className="font-mono text-[11px] tracking-widest text-neutral">{f.label}</div>
                <div className="flex items-center gap-2"><pre className="flex-1 overflow-auto font-mono text-sm">{result.data[f.key]}</pre><CopyButton getText={() => result.data[f.key]} enabled /></div>
              </div>
            ))}
          </div>
        ) : <TriStateOutput result={result} phase={phase} emptyHint="输入一个数字,自动换算四种进制…" />}
      </div>
    </div>
  )
}
