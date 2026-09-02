import { useState } from 'react'
import { CopyButton } from '@components/CopyButton'
import { parseImageName } from '../transform'
import type { ParsedImageName } from '../types'

export function ImageParseTab(): JSX.Element {
  const [image, setImage] = useState('')
  const [res, setRes] = useState<ParsedImageName | null>(null)
  const [err, setErr] = useState('')

  const gen = (): void => {
    const r = parseImageName(image)
    if (r.status === 'ok') { setRes(r.data); setErr('') } else { setErr(r.message); setRes(null) }
  }

  const rows: { label: string; value: string }[] = res
    ? [
        { label: 'registry', value: res.registry ?? '—' },
        { label: 'namespace', value: res.namespace ?? '—' },
        { label: 'repo', value: res.repo },
        { label: 'tag', value: res.tag }
      ]
    : []

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-sm text-neutral">完整镜像名
        <input value={image} onChange={(e) => setImage(e.target.value)} placeholder="registry.example.com:5000/ns/app:v2" className="input input-bordered input-sm flex-1 font-mono" />
      </label>
      <button className="btn btn-sm btn-primary" onClick={gen}>解析</button>
      {err && <div className="text-error text-sm">{err}</div>}
      {res && (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center gap-2">
              <span className="w-24 font-mono text-[11px] text-neutral">{r.label}</span>
              <code className="flex-1 rounded bg-base-100 p-1 font-mono text-sm">{r.value}</code>
              <CopyButton getText={() => r.value} enabled />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
