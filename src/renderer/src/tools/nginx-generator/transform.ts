import type { ToolResult } from '@core/types'
import type { NginxOptions } from './types'

export function generateNginxConfig(o: NginxOptions): ToolResult<string> {
  if (!o.serverName.trim()) return { status: 'error', kind: 'invalid-input', message: '请填写 server_name' }
  if (o.upstream && o.upstream.servers.length === 0) return { status: 'error', kind: 'invalid-input', message: '请填写至少一个 upstream server' }
  const out: string[] = ['# 生成的 nginx 配置', '']
  if (o.upstream) {
    const s = o.upstream.strategy
    out.push('upstream backend {', s === 'least_conn' ? '  least_conn;' : s === 'ip_hash' ? '  ip_hash;' : '  # 轮询(默认)', ...o.upstream.servers.map((v) => `  server ${v.host};`), '}', '')
  }
  out.push('server {', `  listen ${o.listen}${o.sslCert ? ' ssl' : ''};`, `  server_name ${o.serverName};`)
  if (o.sslCert && o.sslKey) { out.push(`  ssl_certificate ${o.sslCert};`, `  ssl_certificate_key ${o.sslKey};`) }
  if (o.forceHttps) out.push('  if ($scheme != "https") { return 301 https://$host$request_uri; }')
  if (o.root) out.push(`  root ${o.root};`)
  if (o.proxyPass) {
    out.push(`  location / {`, `    proxy_pass ${o.proxyPass};`, '    proxy_set_header Host $host;', '    proxy_set_header X-Real-IP $remote_addr;', '    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;')
    if (o.websocket) out.push('    proxy_set_header Upgrade $http_upgrade;', '    proxy_set_header Connection "upgrade";')
    out.push('  }')
  }
  if (o.cache) out.push('  location ~* \\.(css|js|png|jpg|svg)$ { expires 7d; add_header Cache-Control "public"; }')
  if (o.gzip) out.push('  gzip on;', '  gzip_types text/plain text/css application/json application/javascript;')
  if (o.securityHeaders) out.push('  add_header X-Frame-Options "SAMEORIGIN";', '  add_header X-Content-Type-Options "nosniff";', '  add_header Content-Security-Policy "default-src \'self\'";', '  server_tokens off;')
  if (o.hsts) out.push('  add_header Strict-Transport-Security "max-age=31536000" always;')
  out.push('}')
  return { status: 'ok', data: out.join('\n') }
}
