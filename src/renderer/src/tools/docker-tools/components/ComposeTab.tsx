import { useState } from 'react'
import { CopyButton } from '@components/CopyButton'
import { generateCompose } from '../transform'
import type { ComposeService } from '../types'

interface SvcDraft {
  name: string
  image: string
  portsStr: string
  volumesStr: string
  envsStr: string
  dependsStr: string
}

const BLANK: SvcDraft = { name: '', image: '', portsStr: '', volumesStr: '', envsStr: '', dependsStr: '' }

function build(services: SvcDraft[]): ComposeService[] {
  return services.map((s) => ({
    name: s.name,
    image: s.image,
    ports: s.portsStr.split('\n').filter(Boolean),
    volumes: s.volumesStr.split('\n').filter(Boolean),
    envs: s.envsStr.split('\n').filter(Boolean),
    dependsOn: s.dependsStr.split('\n').filter(Boolean)
  }))
}

export function ComposeTab(): JSX.Element {
  const [services, setServices] = useState<SvcDraft[]>([{ ...BLANK }])
  const [out, setOut] = useState('')
  const [err, setErr] = useState('')

  const patch = (i: number, p: Partial<SvcDraft>): void => {
    setServices((prev) => prev.map((s, j) => (j === i ? { ...s, ...p } : s)))
  }
  const remove = (i: number): void => setServices((prev) => prev.filter((_, j) => j !== i))
  const add = (): void => setServices((prev) => [...prev, { ...BLANK }])

  const gen = (): void => {
    const r = generateCompose(build(services))
    if (r.status === 'ok') { setOut(r.data); setErr('') } else { setErr(r.message); setOut('') }
  }

  return (
    <div className="space-y-3">
      {services.map((s, i) => (
        <div key={i} className="space-y-2 rounded border border-base-300 bg-base-100 p-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] text-neutral">服务 {i + 1}</span>
            <button className="btn btn-xs btn-ghost ml-auto" onClick={() => remove(i)}>删除</button>
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="flex items-center gap-2 text-sm text-neutral">name
              <input value={s.name} onChange={(e) => patch(i, { name: e.target.value })} placeholder="web" className="input input-bordered input-sm w-28 font-mono" />
            </label>
            <label className="flex items-center gap-2 text-sm text-neutral">image
              <input value={s.image} onChange={(e) => patch(i, { image: e.target.value })} placeholder="nginx:alpine" className="input input-bordered input-sm flex-1 font-mono" />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm text-neutral">ports(每行)
            <textarea value={s.portsStr} onChange={(e) => patch(i, { portsStr: e.target.value })} placeholder="8080:80" className="textarea textarea-bordered textarea-sm flex-1 font-mono" rows={1} />
          </label>
          <label className="flex items-center gap-2 text-sm text-neutral">volumes(每行)
            <textarea value={s.volumesStr} onChange={(e) => patch(i, { volumesStr: e.target.value })} placeholder="./data:/data" className="textarea textarea-bordered textarea-sm flex-1 font-mono" rows={1} />
          </label>
          <label className="flex items-center gap-2 text-sm text-neutral">envs(每行 K=V)
            <textarea value={s.envsStr} onChange={(e) => patch(i, { envsStr: e.target.value })} placeholder="NODE_ENV=prod" className="textarea textarea-bordered textarea-sm flex-1 font-mono" rows={1} />
          </label>
          <label className="flex items-center gap-2 text-sm text-neutral">depends_on(每行)
            <textarea value={s.dependsStr} onChange={(e) => patch(i, { dependsStr: e.target.value })} placeholder="db" className="textarea textarea-bordered textarea-sm flex-1 font-mono" rows={1} />
          </label>
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        <button className="btn btn-sm btn-ghost" onClick={add}>+ 新增服务</button>
        <button className="btn btn-sm btn-primary" onClick={gen}>生成</button>
      </div>
      {err && <div className="text-error text-sm">{err}</div>}
      {out && <div className="flex items-center gap-2"><pre className="flex-1 overflow-auto rounded bg-base-100 p-2 font-mono text-sm">{out}</pre><CopyButton getText={() => out} enabled /></div>}
    </div>
  )
}
