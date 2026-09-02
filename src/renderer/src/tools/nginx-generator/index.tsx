import { useState } from 'react'
import { CopyButton } from '@components/CopyButton'
import { generateNginxConfig } from './transform'
import type { NginxOptions, UpstreamServer } from './types'

type Strategy = 'round_robin' | 'least_conn' | 'ip_hash'

interface FormState {
  serverName: string
  listen: number
  root: string
  proxyPass: string
  websocket: boolean
  sslCert: string
  sslKey: string
  forceHttps: boolean
  hsts: boolean
  cache: boolean
  gzip: boolean
  securityHeaders: boolean
  upstreamServers: string
  upstreamStrategy: Strategy
}

const STRATEGIES: { id: Strategy; label: string }[] = [
  { id: 'round_robin', label: '轮询' },
  { id: 'least_conn', label: '最少连接' },
  { id: 'ip_hash', label: 'IP Hash' }
]

export default function NginxGeneratorPage(): JSX.Element {
  const [f, setF] = useState<FormState>({
    serverName: '', listen: 80, root: '', proxyPass: '', websocket: false,
    sslCert: '', sslKey: '', forceHttps: false, hsts: false, cache: false, gzip: false, securityHeaders: false,
    upstreamServers: '', upstreamStrategy: 'round_robin'
  })
  const [out, setOut] = useState('')
  const [err, setErr] = useState('')

  const set = (patch: Partial<FormState>): void => setF({ ...f, ...patch })

  const gen = (): void => {
    const servers: UpstreamServer[] = f.upstreamServers.split('\n').filter(Boolean).map((host) => ({ host: host.trim() }))
    const opts: NginxOptions = {
      serverName: f.serverName,
      listen: f.listen,
      root: f.root || undefined,
      proxyPass: f.proxyPass || undefined,
      websocket: f.websocket,
      sslCert: f.sslCert || undefined,
      sslKey: f.sslKey || undefined,
      forceHttps: f.forceHttps,
      hsts: f.hsts,
      cache: f.cache,
      gzip: f.gzip,
      securityHeaders: f.securityHeaders,
      upstream: servers.length ? { servers, strategy: f.upstreamStrategy } : undefined
    }
    const r = generateNginxConfig(opts)
    if (r.status === 'ok') { setOut(r.data); setErr('') } else { setErr(r.message); setOut('') }
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <header className="mb-4 flex items-baseline gap-3">
        <h1 className="text-2xl font-bold">nginx 配置生成</h1>
        <span className="font-mono text-[11px] tracking-[0.25em] text-neutral">SERVER · SSL · PROXY · GZIP</span>
      </header>
      <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
        <section className="border border-base-300 bg-base-200/40 p-4 space-y-2">
          <label className="flex items-center gap-2 text-sm">server_name <input className="input input-bordered input-sm flex-1 font-mono" value={f.serverName} onChange={(e) => set({ serverName: e.target.value })} /></label>
          <label className="flex items-center gap-2 text-sm">listen <input className="input input-bordered input-sm w-20 font-mono" value={f.listen} onChange={(e) => set({ listen: Number(e.target.value) || 0 })} /></label>
          <label className="flex items-center gap-2 text-sm">root <input className="input input-bordered input-sm flex-1 font-mono" value={f.root} onChange={(e) => set({ root: e.target.value })} /></label>
          <label className="flex items-center gap-2 text-sm">proxy_pass <input className="input input-bordered input-sm flex-1 font-mono" value={f.proxyPass} onChange={(e) => set({ proxyPass: e.target.value })} /></label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.websocket} onChange={(e) => set({ websocket: e.target.checked })} />WebSocket</label>
          <label className="flex items-center gap-2 text-sm">ssl_cert <input className="input input-bordered input-sm flex-1 font-mono" value={f.sslCert} onChange={(e) => set({ sslCert: e.target.value })} /></label>
          <label className="flex items-center gap-2 text-sm">ssl_key <input className="input input-bordered input-sm flex-1 font-mono" value={f.sslKey} onChange={(e) => set({ sslKey: e.target.value })} /></label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.forceHttps} onChange={(e) => set({ forceHttps: e.target.checked })} />强制 HTTPS</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.hsts} onChange={(e) => set({ hsts: e.target.checked })} />HSTS</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.cache} onChange={(e) => set({ cache: e.target.checked })} />静态缓存</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.gzip} onChange={(e) => set({ gzip: e.target.checked })} />gzip</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.securityHeaders} onChange={(e) => set({ securityHeaders: e.target.checked })} />安全头</label>
          <label className="items-center gap-2 text-sm flex">upstream servers(每行 host)
            <textarea className="textarea textarea-bordered textarea-sm flex-1 font-mono" rows={2} value={f.upstreamServers} onChange={(e) => set({ upstreamServers: e.target.value })} placeholder="10.0.0.1:8080" />
          </label>
          <label className="flex items-center gap-2 text-sm">upstream 策略
            <select className="select select-bordered select-sm" value={f.upstreamStrategy} onChange={(e) => set({ upstreamStrategy: e.target.value as Strategy })}>
              {STRATEGIES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </label>
          <button className="btn btn-sm btn-primary" onClick={gen}>生成</button>
        </section>
        <section className="border border-base-300 bg-base-200/40 p-4">
          {err ? <div className="text-error text-sm">{err}</div>
            : out ? <div className="flex items-start gap-2"><pre className="flex-1 overflow-auto rounded bg-base-100 p-2 font-mono text-xs">{out}</pre><CopyButton getText={() => out} enabled /></div>
            : <p className="text-sm text-neutral">填写左侧选项,点「生成」得到 nginx 配置…</p>}
        </section>
      </div>
    </div>
  )
}
