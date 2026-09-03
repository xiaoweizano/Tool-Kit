export interface UpstreamServer { host: string }
export type UpstreamStrategy = 'round_robin' | 'least_conn' | 'ip_hash'
export interface LocationBlock {
  type: 'static' | 'proxy' | 'redirect' | 'custom'
  path: string
  root?: string
  proxyPass?: string
  redirect?: string
  custom?: string
}
export interface ServerBlock {
  serverName: string
  listen: number
  ssl?: boolean
  sslCert?: string
  sslKey?: string
  root?: string
  proxyPass?: string
  websocket?: boolean
  forceHttps?: boolean
  redirectCode?: '301' | '308'
  hsts?: boolean
  cache?: boolean
  gzip?: boolean
  securityHeaders?: boolean
  locations?: LocationBlock[]
}
export interface NginxOptions {
  upstream?: { servers: UpstreamServer[]; strategy: UpstreamStrategy }
  servers: ServerBlock[]
}
