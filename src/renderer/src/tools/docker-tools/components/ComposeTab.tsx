import { useState } from 'react'
import { CopyButton } from '@components/CopyButton'
import { generateCompose } from '../transform'
import { DOCKER_TEMPLATES } from '../data/templates'
import type { ComposeService } from '../types'

interface SvcDraft {
  name: string
  image: string
  portsStr: string
  volumesStr: string
  envsStr: string
  dependsStr: string
  restart: string
  networkMode: string
  loggingDriver: string
  maxSize: string
}

const BLANK: SvcDraft = { name: '', image: '', portsStr: '', volumesStr: '', envsStr: '', dependsStr: '', restart: '', networkMode: '', loggingDriver: '', maxSize: '' }

function build(services: SvcDraft[]): ComposeService[] {
  return services.map((s): ComposeService => ({
    name: s.name,
    image: s.image,
    ports: s.portsStr.split('\n').filter(Boolean),
    volumes: s.volumesStr.split('\n').filter(Boolean),
    envs: s.envsStr.split('\n').filter(Boolean),
    dependsOn: s.dependsStr.split('\n').filter(Boolean),
    restart: s.restart || undefined,
    networkMode: s.networkMode || undefined,
    logging: s.loggingDriver ? { driver: s.loggingDriver, options: s.maxSize ? { 'max-size': s.maxSize } : {} } : undefined
  }))
}

export function ComposeTab(): JSX.Element {
  const [services, setServices] = useState<SvcDraft[]>([{ ...BLANK }])
  const [tmpl, setTmpl] = useState('')
  const [out, setOut] = useState('')
  const [err, setErr] = useState('')

  const patch = (i: number, p: Partial<SvcDraft>): void => {
    setServices((prev) => prev.map((s, j) => (j === i ? { ...s, ...p } : s)))
  }
  const remove = (i: number): void => setServices((prev) => prev.filter((_, j) => j !== i))
  const add = (): void => setServices((prev) => [...prev, { ...BLANK }])

  const onTemplate = (id: string): void => {
    if (!id) return
    const t = DOCKER_TEMPLATES.find((x) => x.id === id)
    if (!t) return
    const fill: Partial<SvcDraft> = {
      name: t.id,
      image: t.image,
      portsStr: t.ports.join('\n'),
      volumesStr: t.volumes.join('\n'),
      envsStr: t.envs.join('\n')
    }
    setServices((prev) => (prev.length ? prev.map((s, j) => (j === 0 ? { ...s, ...fill } : s)) : [{ ...BLANK, ...fill }]))
  }

  const gen = (): void => {
    const r = generateCompose(build(services))
    if (r.status === 'ok') { setOut(r.data); setErr('') } else { setErr(r.message); setOut('') }
  }

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-sm text-neutral">模板
        <select className="select select-bordered select-sm" value={tmpl} onChange={(e) => { setTmpl(e.target.value); onTemplate(e.target.value) }}>
          <option value="">手动</option>
          {DOCKER_TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
      </label>
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
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-neutral">restart
              <select className="select select-bordered select-sm" value={s.restart} onChange={(e) => patch(i, { restart: e.target.value })}>
                <option value="">无</option>
                <option value="no">no</option>
                <option value="always">always</option>
                <option value="unless-stopped">unless-stopped</option>
                <option value="on-failure">on-failure</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm text-neutral">network_mode
              <select className="select select-bordered select-sm" value={s.networkMode} onChange={(e) => patch(i, { networkMode: e.target.value })}>
                <option value="">默认</option>
                <option value="bridge">bridge</option>
                <option value="host">host</option>
                <option value="none">none</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm text-neutral">log driver
              <select className="select select-bordered select-sm" value={s.loggingDriver} onChange={(e) => patch(i, { loggingDriver: e.target.value })}>
                <option value="">无</option>
                <option value="json-file">json-file</option>
                <option value="syslog">syslog</option>
                <option value="journald">journald</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm text-neutral">max-size
              <input value={s.maxSize} onChange={(e) => patch(i, { maxSize: e.target.value })} placeholder="10m" className="input input-bordered input-sm w-20 font-mono" />
            </label>
          </div>
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
