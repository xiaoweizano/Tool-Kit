import { useState } from 'react'
import { CopyButton } from '@components/CopyButton'
import { generateNginxConfig, validateNginxConfig } from './transform'
import type { NginxOptions, ServerBlock, LocationBlock } from './types'

type Strategy = 'round_robin' | 'least_conn' | 'ip_hash'
const BLANK_SERVER = (): ServerBlock => ({ serverName: '', listen: 80, ssl: false, forceHttps: false, locations: [] })
const BLANK_LOC = (): LocationBlock => ({ type: 'static', path: '/' })
const STRATEGIES: { id: Strategy; label: string }[] = [{ id: 'round_robin', label: '轮询' }, { id: 'least_conn', label: '最少连接' }, { id: 'ip_hash', label: 'IP Hash' }]
const LOC_TYPES: { id: LocationBlock['type']; label: string }[] = [{ id: 'static', label: '静态' }, { id: 'proxy', label: '代理' }, { id: 'redirect', label: '重定向' }, { id: 'custom', label: '自定义' }]

export default function NginxGeneratorPage(): JSX.Element {
  const [servers, setServers] = useState<ServerBlock[]>([BLANK_SERVER()])
  const [upstreamServers, setUpstreamServers] = useState('')
  const [upstreamStrategy, setUpstreamStrategy] = useState<Strategy>('round_robin')
  const [out, setOut] = useState('')
  const [errors, setErrors] = useState('')
  const [problems, setProblems] = useState<string[]>([])

  const patch = (i: number, p: Partial<ServerBlock>): void => setServers((prev) => prev.map((s, j) => (j === i ? { ...s, ...p } : s)))
  const patchLoc = (i: number, li: number, p: Partial<LocationBlock>): void => setServers((prev) => prev.map((s, j) => (j === i ? { ...s, locations: (s.locations ?? []).map((l, k) => (k === li ? { ...l, ...p } : l)) } : s)))
  const addServer = (): void => setServers((p) => [...p, BLANK_SERVER()])
  const removeServer = (i: number): void => setServers((p) => p.filter((_, j) => j !== i))
  const addLoc = (i: number): void => setServers((p) => p.map((s, j) => (j === i ? { ...s, locations: [...(s.locations ?? []), BLANK_LOC()] } : s)))

  const build = (): NginxOptions => ({
    upstream: upstreamServers.trim() ? { servers: upstreamServers.split('\n').filter(Boolean).map((host) => ({ host: host.trim() })), strategy: upstreamStrategy } : undefined,
    servers,
  })
  const setProxyToUpstream = (i: number): void => { if (upstreamServers.trim()) patch(i, { proxyPass: 'http://backend', root: '' }) }

  const gen = (): void => { setProblems([]); const r = generateNginxConfig(build()); if (r.status === 'ok') { setOut(r.data); setErrors('') } else { setErrors(r.message); setOut('') } }
  const check = (): void => { setProblems(validateNginxConfig(build())); setOut('') }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <header className="mb-4 flex items-baseline gap-3">
        <h1 className="text-2xl font-bold">nginx 配置生成</h1>
        <span className="font-mono text-[11px] tracking-[0.25em] text-neutral">MULTI-SERVER · SSL · PROXY · CHECK</span>
      </header>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="space-y-3 border border-base-300 bg-base-200/40 p-4">
          <label className="flex items-center gap-2 text-sm">upstream(每行 host)
            <textarea className="textarea textarea-bordered textarea-sm flex-1 font-mono" rows={2} value={upstreamServers} onChange={(e) => setUpstreamServers(e.target.value)} placeholder="10.0.0.1:8080" /></label>
          <label className="flex items-center gap-2 text-sm">策略
            <select className="select select-bordered select-sm" value={upstreamStrategy} onChange={(e) => setUpstreamStrategy(e.target.value as Strategy)}>{STRATEGIES.map((s) => <option key={s.id}>{s.label}</option>)}</select></label>
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-sm btn-primary" onClick={gen}>生成</button>
            <button className="btn btn-sm btn-outline" onClick={check}>配置检查</button>
            <button className="btn btn-sm btn-ghost" onClick={addServer}>+ 新增 server</button>
          </div>
          {problems.length > 0 && <div className="rounded border border-error/50 bg-base-100 p-3 text-sm text-error"><div className="font-mono text-[11px] tracking-widest text-error">发现问题</div><ul className="list-disc pl-5">{problems.map((p, i) => <li key={i}>{p}</li>)}</ul></div>}
          {errors && <div className="text-error text-sm">{errors}</div>}
        </section>
        <section className="border border-base-300 bg-base-200/40 p-4">
          {out ? <div className="flex items-start gap-2"><pre className="flex-1 overflow-auto rounded bg-base-100 p-2 font-mono text-xs">{out}</pre><CopyButton getText={() => out} enabled /></div> : <p className="text-sm text-neutral">填写左侧选项,点「生成」得到 nginx 配置…</p>}
        </section>
      </div>
      <div className="mt-4 grid gap-3">
        {servers.map((s, i) => (
          <div key={i} className="space-y-2 rounded border border-base-300 bg-base-100 p-3">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] text-neutral">server {i + 1}</span>
              <button className="btn btn-xs btn-ghost ml-auto" onClick={() => removeServer(i)}>删除</button>
            </div>
            <div className="flex flex-wrap gap-2">
              <label className="flex items-center gap-2 text-sm">server_name<input className="input input-bordered input-sm font-mono" value={s.serverName} onChange={(e) => patch(i, { serverName: e.target.value })} /></label>
              <label className="flex items-center gap-2 text-sm">listen<input className="input input-bordered input-sm w-20 font-mono" value={s.listen} onChange={(e) => patch(i, { listen: Number(e.target.value) || 80 })} /></label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={s.ssl} onChange={(e) => patch(i, { ssl: e.target.checked, listen: e.target.checked ? 443 : 80 })} />SSL</label>
            </div>
            {s.ssl && (
              <div className="flex flex-wrap gap-2 border border-base-300 bg-base-200/40 p-2">
                <label className="flex items-center gap-2 text-sm">证书路径<input className="input input-bordered input-sm flex-1 font-mono" value={s.sslCert ?? ''} onChange={(e) => patch(i, { sslCert: e.target.value })} placeholder="/etc/nginx/cert.pem" /></label>
                <label className="flex items-center gap-2 text-sm">私钥路径<input className="input input-bordered input-sm flex-1 font-mono" value={s.sslKey ?? ''} onChange={(e) => patch(i, { sslKey: e.target.value })} placeholder="/etc/nginx/key.pem" /></label>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span>模式:</span>
              <label className="flex items-center gap-1"><input type="radio" name={`mode-${i}`} checked={!!s.proxyPass} onChange={() => patch(i, { proxyPass: '', root: '' })} />反向代理</label>
              <input className="input input-bordered input-sm flex-1 font-mono" value={s.proxyPass ?? ''} onChange={(e) => patch(i, { proxyPass: e.target.value, root: '' })} placeholder="http://backend" disabled={!!s.root} />
              <button className="btn btn-xs btn-ghost" onClick={() => setProxyToUpstream(i)}>用 upstream</button>
              <label className="flex items-center gap-1"><input type="radio" name={`mode-${i}`} checked={!!s.root} onChange={() => patch(i, { root: '/var/www', proxyPass: '' })} />静态 root</label>
              <input className="input input-bordered input-sm flex-1 font-mono" value={s.root ?? ''} onChange={(e) => patch(i, { root: e.target.value, proxyPass: '' })} placeholder="/var/www/html" disabled={!!s.proxyPass} />
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              <label className="flex items-center gap-1"><input type="checkbox" checked={s.websocket ?? false} onChange={(e) => patch(i, { websocket: e.target.checked })} />WebSocket</label>
              <label className="flex items-center gap-1"><input type="checkbox" checked={s.forceHttps ?? false} onChange={(e) => patch(i, { forceHttps: e.target.checked })} />强制 HTTPS</label>
              <label className="flex items-center gap-1"><input type="checkbox" checked={s.cache ?? false} onChange={(e) => patch(i, { cache: e.target.checked })} />静态缓存</label>
              <label className="flex items-center gap-1"><input type="checkbox" checked={s.gzip ?? false} onChange={(e) => patch(i, { gzip: e.target.checked })} />gzip</label>
              <label className="flex items-center gap-1"><input type="checkbox" checked={s.securityHeaders ?? false} onChange={(e) => patch(i, { securityHeaders: e.target.checked })} />安全头</label>
              <label className="flex items-center gap-1"><input type="checkbox" checked={s.hsts ?? false} onChange={(e) => patch(i, { hsts: e.target.checked })} />HSTS</label>
            </div>
            {s.forceHttps && s.ssl && (
              <div className="rounded border border-base-300 bg-base-200/50 p-2 text-xs text-neutral">强制 HTTPS 步骤:①确保证书/私钥路径已填 ②选跳转码 ③生成后自动产出 80→跳转 server 与 443 主 server。跳转码:
                <select className="select select-bordered select-sm" value={s.redirectCode ?? '301'} onChange={(e) => patch(i, { redirectCode: e.target.value as '301' | '308' })}><option value="301">301</option><option value="308">308</option></select>
              </div>
            )}
            <div className="space-y-1">
              {(s.locations ?? []).map((l, li) => (
                <div key={li} className="flex flex-wrap items-center gap-2 text-sm">
                  <select className="select select-bordered select-sm" value={l.type} onChange={(e) => patchLoc(i, li, { type: e.target.value as LocationBlock['type'] })}>{LOC_TYPES.map((t) => <option key={t.id}>{t.label}</option>)}</select>
                  <input className="input input-bordered input-sm w-32 font-mono" value={l.path} onChange={(e) => patchLoc(i, li, { path: e.target.value })} placeholder="/api/" />
                  {l.type === 'proxy' && <input className="input input-bordered input-sm flex-1 font-mono" value={l.proxyPass ?? ''} onChange={(e) => patchLoc(i, li, { proxyPass: e.target.value })} placeholder="http://backend" />}
                  {l.type === 'static' && <input className="input input-bordered input-sm flex-1 font-mono" value={l.root ?? ''} onChange={(e) => patchLoc(i, li, { root: e.target.value })} placeholder="/var/www" />}
                  {l.type === 'redirect' && <input className="input input-bordered input-sm flex-1 font-mono" value={l.redirect ?? ''} onChange={(e) => patchLoc(i, li, { redirect: e.target.value })} placeholder="/new" />}
                  {l.type === 'custom' && <input className="input input-bordered input-sm flex-1 font-mono" value={l.custom ?? ''} onChange={(e) => patchLoc(i, li, { custom: e.target.value })} placeholder="proxy_set_header X-A $v;" />}
                </div>
              ))}
              <button className="btn btn-xs btn-ghost" onClick={() => addLoc(i)}>+ 新增 location</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
