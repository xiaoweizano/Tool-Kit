import { useState } from 'react'
import { CopyButton } from '@components/CopyButton'
import { generateRun } from '../transform'

export function RunTab(): JSX.Element {
  const [image, setImage] = useState('')
  const [name, setName] = useState('')
  const [ports, setPorts] = useState('')
  const [volumes, setVolumes] = useState('')
  const [envs, setEnvs] = useState('')
  const [restart, setRestart] = useState('')
  const [network, setNetwork] = useState('')
  const [out, setOut] = useState('')
  const [err, setErr] = useState('')

  const gen = (): void => {
    const r = generateRun({
      image,
      name: name || undefined,
      ports: ports.split('\n').filter(Boolean),
      volumes: volumes.split('\n').filter(Boolean),
      envs: envs.split('\n').filter(Boolean),
      restart: restart || undefined,
      network: network || undefined
    })
    if (r.status === 'ok') { setOut(r.data); setErr('') } else { setErr(r.message); setOut('') }
  }

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-sm text-neutral">镜像
        <input value={image} onChange={(e) => setImage(e.target.value)} placeholder="nginx:alpine" className="input input-bordered input-sm flex-1 font-mono" />
      </label>
      <label className="flex items-center gap-2 text-sm text-neutral">容器名(可选)
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="myapp" className="input input-bordered input-sm flex-1 font-mono" />
      </label>
      <label className="flex items-center gap-2 text-sm text-neutral">端口映射(每行 <span className="font-mono">宿主:容器</span>)
        <textarea value={ports} onChange={(e) => setPorts(e.target.value)} placeholder="8080:80" className="textarea textarea-bordered textarea-sm flex-1 font-mono" rows={2} />
      </label>
      <label className="flex items-center gap-2 text-sm text-neutral">挂载卷(每行)
        <textarea value={volumes} onChange={(e) => setVolumes(e.target.value)} placeholder="./data:/var/lib/data" className="textarea textarea-bordered textarea-sm flex-1 font-mono" rows={2} />
      </label>
      <label className="flex items-center gap-2 text-sm text-neutral">环境变量(每行 <span className="font-mono">K=V</span>)
        <textarea value={envs} onChange={(e) => setEnvs(e.target.value)} placeholder="NODE_ENV=prod" className="textarea textarea-bordered textarea-sm flex-1 font-mono" rows={2} />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-neutral">restart
          <select className="select select-bordered select-sm" value={restart} onChange={(e) => setRestart(e.target.value)}>
            <option value="">无</option>
            <option value="unless-stopped">unless-stopped</option>
            <option value="always">always</option>
            <option value="on-failure">on-failure</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-neutral">network(可选)
          <input value={network} onChange={(e) => setNetwork(e.target.value)} placeholder="bridge" className="input input-bordered input-sm w-32 font-mono" />
        </label>
      </div>
      <button className="btn btn-sm btn-primary" onClick={gen}>生成</button>
      {err && <div className="text-error text-sm">{err}</div>}
      {out && <div className="flex items-center gap-2"><pre className="flex-1 overflow-auto rounded bg-base-100 p-2 font-mono text-sm">{out}</pre><CopyButton getText={() => out} enabled /></div>}
    </div>
  )
}
