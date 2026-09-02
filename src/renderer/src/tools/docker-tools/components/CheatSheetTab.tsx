import { useMemo, useState } from 'react'
import { DOCKER_COMMANDS } from '../data/commands'

export function CheatSheetTab(): JSX.Element {
  const [q, setQ] = useState('')
  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return DOCKER_COMMANDS
    return DOCKER_COMMANDS.filter((c) => c.name.toLowerCase().includes(s) || c.desc.toLowerCase().includes(s))
  }, [q])

  return (
    <div className="space-y-3">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索 docker 命令…" className="input input-bordered input-sm w-full font-mono" />
      <div className="grid gap-2 md:grid-cols-2">
        {list.map((c) => (
          <div key={c.name} className="rounded border border-base-300 bg-base-100 p-2">
            <div className="font-mono text-sm">{c.name}</div>
            <div className="text-xs text-neutral">{c.desc}</div>
            {c.examples?.map((e) => <div key={e} className="mt-1 font-mono text-[11px] text-neutral">{e}</div>)}
          </div>
        ))}
        {list.length === 0 && <p className="text-sm text-neutral md:col-span-2">无匹配命令</p>}
      </div>
    </div>
  )
}
