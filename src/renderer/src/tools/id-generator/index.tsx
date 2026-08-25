import { useState } from 'react'
import { CopyButton } from '@components/CopyButton'
import { TriStateOutput } from '@components/TriStateOutput'
import { generateIds, type IdType } from './transform'

const TYPES: { id: IdType; label: string }[] = [
  { id: 'uuid', label: 'UUID v4' },
  { id: 'snowflake', label: '雪花' },
  { id: 'sequence', label: '数字序列' },
  { id: 'shortcode', label: '随机短码' }
]

export default function IdGeneratorPage(): JSX.Element {
  const [type, setType] = useState<IdType>('uuid')
  const [count, setCount] = useState(5)
  const [prefix, setPrefix] = useState('')
  const [out, setOut] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const gen = (): void => {
    const r = generateIds(type, count, { prefix })
    if (r.status === 'ok') { setOut(r.data); setErr(null) } else { setOut(null); setErr(r.message) }
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <header className="mb-4 flex items-baseline gap-3">
        <h1 className="text-2xl font-bold">ID 生成</h1>
        <span className="font-mono text-[11px] tracking-[0.25em] text-neutral">UUID · SNOWFLAKE · SEQUENCE</span>
        <CopyButton getText={() => out ?? ''} enabled={!!out} />
      </header>
      <section className="border border-base-300 bg-base-200/40 p-4">
        <div className="flex flex-wrap items-center gap-3">
          {TYPES.map((t) => (
            <button key={t.id} className={`btn btn-sm font-mono ${type === t.id ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setType(t.id)}>{t.label}</button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-neutral">数量
            <input type="number" min={1} max={1000} value={count} onChange={(e) => setCount(Number(e.target.value))} className="input input-bordered input-sm w-24 font-mono" />
          </label>
          <label className="flex items-center gap-2 text-sm text-neutral">前缀
            <input value={prefix} onChange={(e) => setPrefix(e.target.value)} placeholder="可选,如 t_" className="input input-bordered input-sm w-32 font-mono" />
          </label>
          <button className="btn btn-sm btn-primary ml-auto" onClick={gen}>生成</button>
        </div>
      </section>
      <div className="mt-4">
        <TriStateOutput
          result={err ? { status: 'error', kind: 'invalid-input', message: err } : out ? { status: 'ok', data: out } : null}
          phase="done"
          emptyHint="选择类型与数量,点「生成」得到一批 ID…"
        />
      </div>
    </div>
  )
}