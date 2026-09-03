import type { ToolResult } from '@core/types'
import type { NginxOptions, ServerBlock, LocationBlock } from './types'

function locBlock(pad: string, l: LocationBlock): string[] {
  const out: string[] = [`${pad}location ${l.path} {`]
  if (l.type === 'static') { if (l.root) out.push(`${pad}  root ${l.root};`) }
  else if (l.type === 'proxy') {
    out.push(`${pad}  proxy_pass ${l.proxyPass};`, `${pad}  proxy_set_header Host $host;`, `${pad}  proxy_set_header X-Real-IP $remote_addr;`, `${pad}  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;`)
  } else if (l.type === 'redirect') { out.push(`${pad}  return 302 ${l.redirect ?? '/'}`) }
  else if (l.custom) out.push(...l.custom.split('\n').map((c) => `${pad}  ${c}`))
  out.push(`${pad}}`)
  return out
}

function serverBlock(s: ServerBlock): string[] {
  const out: string[] = ['server {', `  listen ${s.listen}${s.ssl ? ' ssl' : ''};`, `  server_name ${s.serverName};`]
  if (s.ssl && s.sslCert && s.sslKey) { out.push(`  ssl_certificate ${s.sslCert};`, `  ssl_certificate_key ${s.sslKey};`) }
  if (s.gzip) out.push('  gzip on;', '  gzip_types text/plain text/css application/json application/javascript;')
  if (s.cache) out.push('  location ~* \\.(css|js|png|jpg|svg)$ { expires 7d; add_header Cache-Control "public"; }')
  if (s.securityHeaders) out.push('  add_header X-Frame-Options "SAMEORIGIN";', '  add_header X-Content-Type-Options "nosniff";', '  server_tokens off;')
  if (s.hsts) out.push('  add_header Strict-Transport-Security "max-age=31536000" always;')
  if (s.root) out.push(`  root ${s.root};`)
  if (s.proxyPass) {
    out.push(`  location / {`, `    proxy_pass ${s.proxyPass};`, '    proxy_set_header Host $host;', '    proxy_set_header X-Real-IP $remote_addr;', '    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;')
    if (s.websocket) out.push('    proxy_set_header Upgrade $http_upgrade;', '    proxy_set_header Connection "upgrade";')
    out.push('  }')
  }
  for (const l of s.locations ?? []) out.push(...locBlock('  ', l))
  out.push('}')
  return out
}

export function generateNginxConfig(o: NginxOptions): ToolResult<string> {
  if (!o.servers.length) return { status: 'error', kind: 'invalid-input', message: '请至少配置一个 server 块' }
  for (const s of o.servers) if (!s.serverName.trim()) return { status: 'error', kind: 'invalid-input', message: '请填写 server_name' }
  if (o.upstream && o.upstream.servers.length === 0) return { status: 'error', kind: 'invalid-input', message: 'upstream 至少一个 server' }
  const out: string[] = ['# 生成的 nginx 配置', '']
  if (o.upstream) {
    const s = o.upstream.strategy
    out.push('upstream backend {', s === 'least_conn' ? '  least_conn;' : s === 'ip_hash' ? '  ip_hash;' : '  # 轮询(默认)', ...o.upstream.servers.map((v) => `  server ${v.host};`), '}', '')
  }
  for (const s of o.servers) {
    if (s.forceHttps && s.ssl) {
      const code = s.redirectCode ?? '301'
      out.push('server {', '  listen 80;', `  server_name ${s.serverName};`, `  return ${code} https://$host$request_uri;`, '}', '')
    }
    out.push(...serverBlock(s))
  }
  return { status: 'ok', data: out.join('\n') }
}

export function validateNginxConfig(o: NginxOptions): string[] {
  const problems: string[] = []
  const upstreamDefined = !!o.upstream && o.upstream.servers.length > 0
  for (const s of o.servers) {
    if (!s.serverName.trim()) problems.push('存在未填写 server_name 的 server 块')
    if (s.ssl && (!s.sslCert || !s.sslKey)) problems.push(`server ${s.serverName || '(未命名)'}: SSL 已开启但缺证书路径`)
    if (s.root && s.proxyPass) problems.push(`server ${s.serverName || '(未命名)'}: root 与 proxy_pass 冲突,只能二选一`)
    if (s.proxyPass && s.proxyPass.includes('backend') && !upstreamDefined) problems.push(`server ${s.serverName || '(未命名)'}: proxy_pass 引用未定义的 upstream backend`)
  }
  return problems
}
