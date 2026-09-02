import { useState } from 'react'
import { useLiveTransform } from '@core/useLiveTransform'
import { CopyButton } from '@components/CopyButton'
import { TriStateOutput } from '@components/TriStateOutput'
import { runTransform } from '@core/transform.channel'
import type { ToolResult } from '@core/types'
import type { JwtResult } from './types'

// HS* only — RS* (asymmetric) is deferred to v2 (needs key import UI).
const ALGS = ['HS256', 'HS384', 'HS512']

export default function JwtToolPage(): JSX.Element {
  const { input, setInput, phase, result } = useLiveTransform<string, JwtResult>('jwt-tool')
  const [secret, setSecret] = useState('')
  const [alg, setAlg] = useState('HS256')
  const [expiry, setExpiry] = useState('1h')
  const [actionOut, setActionOut] = useState<string>('')

  const trigger = async (action: string): Promise<void> => {
    const r = await runTransform('jwt-tool', input, { action, secret: secret || 'secret', alg, expiry })
    if (r.status === 'ok') setActionOut((r.data as JwtResult).token ?? JSON.stringify(r.data, null, 2))
    else setActionOut(r.message)
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <header className="mb-4 flex items-baseline gap-3">
        <h1 className="text-2xl font-bold">JWT 解析</h1>
        <span className="font-mono text-[11px] tracking-[0.25em] text-neutral">PARSE · VERIFY · SIGN · RENEW</span>
        <CopyButton getText={() => actionOut} enabled={!!actionOut} />
      </header>
      <section className="border border-base-300 bg-base-200/40 p-4">
        <textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="粘贴 JWT,自动解析…" className="textarea textarea-bordered w-full font-mono" rows={4} />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <input value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="密钥/secret" className="input input-bordered input-sm w-40 font-mono" />
          <select className="select select-bordered select-sm" value={alg} onChange={(e) => setAlg(e.target.value)}>{ALGS.map((a) => <option key={a}>{a}</option>)}</select>
          <input value={expiry} onChange={(e) => setExpiry(e.target.value)} placeholder="expiry 如 1h/7d" className="input input-bordered input-sm w-32 font-mono" />
          <button className="btn btn-sm" onClick={() => trigger('verify')}>校验</button>
          <button className="btn btn-sm" onClick={() => trigger('sign')}>签名(用输入做 payload)</button>
          <button className="btn btn-sm" onClick={() => trigger('renew')}>续期</button>
        </div>
      </section>
      <div className="mt-4">
        {result?.status === 'ok' ? (
          <div className="space-y-3 border border-base-300 bg-base-200/40 p-4 font-mono text-sm">
            {result.data.header && (
              <div>
                <div className="font-mono text-[11px] tracking-widest text-neutral">HEADER</div>
                <pre className="mt-1 overflow-auto rounded bg-base-100 p-2">{JSON.stringify(result.data.header, null, 2)}</pre>
              </div>
            )}
            {result.data.payload && (
              <div>
                <div className="font-mono text-[11px] tracking-widest text-neutral">PAYLOAD</div>
                <pre className="mt-1 overflow-auto rounded bg-base-100 p-2">{JSON.stringify(result.data.payload, null, 2)}</pre>
              </div>
            )}
            {result.data.isValid === true && <div className="text-success">✓ 签名有效</div>}
            {result.data.expiresAt && <div className="text-neutral">过期时间: {result.data.expiresAt}</div>}
          </div>
        ) : (
          <TriStateOutput
            result={(result?.status === 'error' ? result : null) as ToolResult<string> | null}
            phase={phase}
            emptyHint="粘贴 JWT 查看 header/payload…"
          />
        )}
      </div>
      {actionOut && <pre className="mt-4 overflow-auto rounded bg-base-100 p-2 font-mono text-sm">{actionOut}</pre>}
    </div>
  )
}
