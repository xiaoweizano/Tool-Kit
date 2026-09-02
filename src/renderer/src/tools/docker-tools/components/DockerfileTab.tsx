import { useState } from 'react'
import { CopyButton } from '@components/CopyButton'
import { generateDockerfile } from '../transform'
import type { DockerfileOptions } from '../types'

function parseCopies(lines: string[]): DockerfileOptions['copy'] {
  const entries = lines
    .map((line) => line.trim().split(/\s+/))
    .filter((tokens) => tokens.length > 0)
    .map(([src, dest]) => ({ src: src ?? '', dest: dest ?? '' }))
  return entries.length ? entries : undefined
}

export function DockerfileTab(): JSX.Element {
  const [base, setBase] = useState('')
  const [workdir, setWorkdir] = useState('')
  const [copyStr, setCopyStr] = useState('')
  const [runStr, setRunStr] = useState('')
  const [expose, setExpose] = useState('')
  const [entrypoint, setEntrypoint] = useState('')
  const [out, setOut] = useState('')
  const [err, setErr] = useState('')

  const gen = (): void => {
    const runs = runStr.split('\n').filter(Boolean)
    const r = generateDockerfile({
      base,
      workdir: workdir || undefined,
      copy: parseCopies(copyStr.split('\n')),
      run: runs.length ? runs : undefined,
      expose: expose || undefined,
      entrypoint: entrypoint || undefined
    })
    if (r.status === 'ok') { setOut(r.data); setErr('') } else { setErr(r.message); setOut('') }
  }

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-sm text-neutral">base 镜像
        <input value={base} onChange={(e) => setBase(e.target.value)} placeholder="node:18-alpine" className="input input-bordered input-sm flex-1 font-mono" />
      </label>
      <label className="flex items-center gap-2 text-sm text-neutral">WORKDIR(可选)
        <input value={workdir} onChange={(e) => setWorkdir(e.target.value)} placeholder="/app" className="input input-bordered input-sm flex-1 font-mono" />
      </label>
      <label className="flex items-center gap-2 text-sm text-neutral">COPY(每行 <span className="font-mono">src dest</span>)
        <textarea value={copyStr} onChange={(e) => setCopyStr(e.target.value)} placeholder="package.json ./" className="textarea textarea-bordered textarea-sm flex-1 font-mono" rows={2} />
      </label>
      <label className="flex items-center gap-2 text-sm text-neutral">RUN(每行,不含 RUN 前缀)
        <textarea value={runStr} onChange={(e) => setRunStr(e.target.value)} placeholder="npm ci" className="textarea textarea-bordered textarea-sm flex-1 font-mono" rows={2} />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-neutral">EXPOSE(可选)
          <input value={expose} onChange={(e) => setExpose(e.target.value)} placeholder="3000" className="input input-bordered input-sm w-24 font-mono" />
        </label>
        <label className="flex items-center gap-2 text-sm text-neutral">CMD(可选)
          <input value={entrypoint} onChange={(e) => setEntrypoint(e.target.value)} placeholder="npm start" className="input input-bordered input-sm flex-1 font-mono" />
        </label>
      </div>
      <button className="btn btn-sm btn-primary" onClick={gen}>生成</button>
      {err && <div className="text-error text-sm">{err}</div>}
      {out && <div className="flex items-center gap-2"><pre className="flex-1 overflow-auto rounded bg-base-100 p-2 font-mono text-sm">{out}</pre><CopyButton getText={() => out} enabled /></div>}
    </div>
  )
}
