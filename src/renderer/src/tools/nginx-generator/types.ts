// src/renderer/src/tools/nginx-generator/types.ts
export interface UpstreamServer { host: string }
export interface NginxOptions {
  serverName: string; listen: number; root?: string
  proxyPass?: string; websocket?: boolean
  sslCert?: string; sslKey?: string; forceHttps?: boolean; hsts?: boolean
  cache?: boolean; gzip?: boolean
  securityHeaders?: boolean
  upstream?: { servers: UpstreamServer[]; strategy: 'round_robin' | 'least_conn' | 'ip_hash' }
}
