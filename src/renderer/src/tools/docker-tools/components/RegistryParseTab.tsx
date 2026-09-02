import { useState } from 'react'
import { CopyButton } from '@components/CopyButton'
import { parseRegistryUrl } from '../transform'
import type { ParsedRegistryUrl } from '../types'

export function RegistryParseTab(): JSX.Element {
  const [url, setUrl] = useState('')
  const [res, setRes] = useState<ParsedRegistryUrl | null>(null)
  const [err, setErr] = useState('')

  const gen = (): void => {
    const r = parseRegistryUrl(url)
    if (r.status === 'ok') { setRes(r.data); setErr('') } else { setErr(r.message); setRes(null) }
  }

  const rows: { label: string; value: string }[] = res
    ? [
        { label: 'scheme', value: res.scheme },
        { label: 'host', value: res.host },
        { label: 'port', value: res.port ?? '—' },
        { label: 'path', value: res.path ?? '—' }
      ]
    : []

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-sm text-neutral">registry URL
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://registry.example.com:5000/v2" className="input input-bordered input-sm flex-1 font-mono" />
      </label>
      <button className="btn btn-sm btn-primary" onClick={gen}>解析</button>
      {err && <div className="text-error text-sm">{err}</div>}
      {res && (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center gap-2">
              <span className="w-16 font-mono text-[11px] text-neutral">{r.label}</span>
              <code className="flex-1 rounded bg-base-100 p-1 font-mono text-sm">{r.value}</code>
              <CopyButton getText={() => r.value} enabled />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
