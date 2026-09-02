import { describe, it, expect } from 'vitest'
import { generateNginxConfig } from '@tools/nginx-generator/transform'

describe('generateNginxConfig', () => {
  it('basic server block', () => {
    const r = generateNginxConfig({ serverName: 'example.com', listen: 80, root: '/var/www/html' })
    if (r.status !== 'ok') throw new Error('err')
    expect(r.data).toContain('server_name example.com')
    expect(r.data).toContain('root /var/www/html')
  })
  it('proxy with websocket headers', () => {
    const r = generateNginxConfig({ serverName: 'app.com', listen: 80, proxyPass: 'http://backend:8080', websocket: true })
    if (r.status !== 'ok') throw new Error('err')
    expect(r.data).toContain('proxy_pass http://backend:8080')
    expect(r.data).toContain('proxy_set_header Upgrade')
  })
  it('missing server_name invalid', () => {
    const r = generateNginxConfig({ serverName: '', listen: 80 })
    expect(r.status).toBe('error')
    if (r.status === 'error') expect(r.kind).toBe('invalid-input')
  })
  it('upstream with empty servers invalid', () => {
    const r = generateNginxConfig({ serverName: 'x.com', listen: 80, upstream: { servers: [], strategy: 'round_robin' } })
    expect(r.status).toBe('error')
  })
  it('emits ssl + force https + HSTS when enabled', () => {
    const r = generateNginxConfig({
      serverName: 'x.com', listen: 443,
      sslCert: '/etc/nginx/cert.pem', sslKey: '/etc/nginx/key.pem',
      forceHttps: true, hsts: true
    })
    if (r.status !== 'ok') throw new Error('err')
    expect(r.data).toContain('ssl_certificate /etc/nginx/cert.pem')
    expect(r.data).toContain('ssl_certificate_key /etc/nginx/key.pem')
    expect(r.data).toContain('return 301 https://')
    expect(r.data).toContain('Strict-Transport-Security')
  })
  it('emits gzip + cache + security headers when enabled', () => {
    const r = generateNginxConfig({ serverName: 'x.com', listen: 80, gzip: true, cache: true, securityHeaders: true })
    if (r.status !== 'ok') throw new Error('err')
    expect(r.data).toContain('gzip on')
    expect(r.data).toContain('expires 7d')
    expect(r.data).toContain('X-Frame-Options')
    expect(r.data).toContain('server_tokens off')
  })
  it('emits upstream block with servers + least_conn', () => {
    const r = generateNginxConfig({
      serverName: 'x.com', listen: 80,
      upstream: { servers: [{ host: 'a:8080' }, { host: 'b:8080' }], strategy: 'least_conn' }
    })
    if (r.status !== 'ok') throw new Error('err')
    expect(r.data).toContain('upstream backend')
    expect(r.data).toContain('least_conn')
    expect(r.data).toContain('server a:8080;')
    expect(r.data).toContain('server b:8080;')
  })
  it('does NOT emit gzip when disabled (flag-gate)', () => {
    const r = generateNginxConfig({ serverName: 'x.com', listen: 80 })
    if (r.status !== 'ok') throw new Error('err')
    expect(r.data).not.toContain('gzip on')
  })
})
