import { useMemo, useState } from 'react'
import { useLiveTransform } from '@core/useLiveTransform'
import { CopyButton } from '@components/CopyButton'
import { TriStateOutput } from '@components/TriStateOutput'
import { JsonView } from '@components/JsonView'
import { runTransform } from '@core/transform.channel'
import { friendlyTimestamp, timestampToSeconds } from './transform'
import type { ToolResult } from '@core/types'
import type { JwtResult } from './types'

const ALL_ALGS = ['HS256','HS384','HS512','RS256','RS384','RS512','ES256','ES384','ES512','PS256','PS384','PS512']

export default function JwtToolPage(): JSX.Element {
  const { input, setInput, phase, result } = useLiveTransform<string, JwtResult>('jwt-tool')
  const [secret, setSecret] = useState('')
  const [alg, setAlg] = useState('HS256')
  const [expiry, setExpiry] = useState('1h')
  const [actionOut, setActionOut] = useState('')
  const [tsInput, setTsInput] = useState('')
  const [tsOut, setTsOut] = useState('')

  const parsedAlg = useMemo(() => {
    const a = result?.status === 'ok' ? result.data.header?.alg : undefined
    return typeof a === 'string' ? a : undefined
  }, [result])
  const algOptions = parsedAlg && !ALL_ALGS.includes(parsedAlg) ? [...ALL_ALGS, parsedAlg] : ALL_ALGS
  const isAsym = !alg.startsWith('HS')

  const trigger = async (action: string): Promise<void> => {
    const key = isAsym ? secret : secret || 'secret'
    const r = await runTransform('jwt-tool', input, { action, secret: key, alg, expiry })
    if (r.status === 'ok') setActionOut((r.data as JwtResult).token ?? JSON.stringify(r.data, null, 2))
    else setActionOut(r.message)
  }

  const toFriendly = (): void => {
    const n = Number(tsInput)
    setTsOut(Number.isFinite(n) ? friendlyTimestamp(timestampToSeconds(n)) : '无效时间戳')
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
          <input value={secret} onChange={(e) => setSecret(e.target.value)} placeholder={isAsym ? '私钥(签名/续期)或公钥(校验) PEM' : '密钥/secret'} className="input input-bordered input-sm w-52 font-mono" />
          <select className="select select-bordered select-sm" value={alg} onChange={(e) => setAlg(e.target.value)}>
            {algOptions.map((a) => <option key={a}>{a}</option>)}
          </select>
          <input value={expiry} onChange={(e) => setExpiry(e.target.value)} placeholder="expiry 如 1h/7d" className="input input-bordered input-sm w-32 font-mono" />
          <button className="btn btn-sm" onClick={() => trigger('verify')}>校验</button>
          <button className="btn btn-sm" onClick={() => trigger('sign')}>签名(用输入做 payload)</button>
          <button className="btn btn-sm" onClick={() => trigger('renew')}>续期</button>
        </div>
        <div className="mt-2 font-mono text-[11px] text-neutral">续期规则:读取原 payload(保留它),仅重设 exp 为新 expiry(默认 1h,支持 1h/7d/30d 等);沿用原 token 的 alg 重签。非对称(RS/ES/PS)签名/续期需粘贴私钥(PEM),校验则粘贴公钥(PEM)。</div>
      </section>
      <div className="mt-4">
        {result?.status === 'ok' ? (
          <div className="space-y-3 border border-base-300 bg-base-200/40 p-4">
            {result.data.header && (
              <div>
                <div className="font-mono text-[11px] tracking-widest text-neutral">HEADER</div>
                <JsonView value={result.data.header} />
              </div>
            )}
            {result.data.payload && (
              <div>
                <div className="font-mono text-[11px] tracking-widest text-neutral">PAYLOAD</div>
                <JsonView value={result.data.payload} />
                {result.data.friendlyTimes && result.data.friendlyTimes.length > 0 && (
                  <div className="mt-2 grid gap-1 sm:grid-cols-2 text-xs">
                    {result.data.friendlyTimes.map((f) => (
                      <div key={f.field} className="flex justify-between rounded bg-base-100 px-2 py-1">
                        <span className="font-mono text-neutral">{f.field}</span>
                        <span className="font-mono">{f.local}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {result.data.isValid === true && <div className="text-success">✓ 签名有效</div>}
            {result.data.expiresAt && <div className="text-neutral">过期时间: {result.data.expiresAt}</div>}
          </div>
        ) : (
          <TriStateOutput result={(result?.status === 'error' ? result : null) as ToolResult<string> | null} phase={phase} emptyHint="粘贴 JWT 查看 header/payload…" />
        )}
      </div>
      {actionOut && <pre className="mt-4 overflow-auto rounded bg-base-100 p-2 font-mono text-sm">{actionOut}</pre>}
      <section className="mt-4 border border-base-300 bg-base-200/40 p-4">
        <div className="font-mono text-[11px] tracking-widest text-neutral">时间戳 → 友好时间</div>
        <div className="mt-1 flex items-center gap-3">
          <input value={tsInput} onChange={(e) => setTsInput(e.target.value)} placeholder="秒或毫秒时间戳,自动识别" className="input input-bordered input-sm w-52 font-mono" />
          <button className="btn btn-sm" onClick={toFriendly}>转换</button>
          {tsOut && <span className="font-mono text-sm">{tsOut}</span>}
        </div>
      </section>
    </div>
  )
}
