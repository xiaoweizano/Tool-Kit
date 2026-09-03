import { describe, it, expect } from 'vitest'
import { generateNginxConfig, validateNginxConfig } from '@tools/nginx-generator/transform'

describe('generateNginxConfig v2', () => {
  it('ssl server emits cert paths + listen 443 ssl', () => {
    const r = generateNginxConfig({ servers: [{ serverName: 'x.com', listen: 443, ssl: true, sslCert: '/etc/nginx/c.pem', sslKey: '/etc/nginx/k.pem' }] })
    expect(r.status).toBe('ok')
    if (r.status === 'ok') {
      expect(r.data).toContain('listen 443 ssl')
      expect(r.data).toContain('ssl_certificate /etc/nginx/c.pem')
      expect(r.data).toContain('ssl_certificate_key /etc/nginx/k.pem')
    }
  })
  it('force https emits 80 redirect + 443 main server', () => {
    const r = generateNginxConfig({ servers: [{ serverName: 'x.com', listen: 443, ssl: true, sslCert: '/c.pem', sslKey: '/k.pem', forceHttps: true, redirectCode: '301' }] })
    expect(r.status).toBe('ok')
    if (r.status === 'ok') {
      expect(r.data).toContain('return 301 https://$host$request_uri')
      expect(r.data).toContain('listen 80')
      expect(r.data).toContain('listen 443 ssl')
    }
  })
  it('multiple server blocks each emitted', () => {
    const r = generateNginxConfig({ servers: [{ serverName: 'a.com', listen: 80, root: '/var/www/a' }, { serverName: 'b.com', listen: 80, proxyPass: 'http://backend' }] })
    expect(r.status).toBe('ok')
    if (r.status === 'ok') {
      expect(r.data).toContain('server_name a.com')
      expect(r.data).toContain('server_name b.com')
      expect(r.data).toContain('proxy_pass http://backend')
    }
  })
  it('upstream block emitted', () => {
    const r = generateNginxConfig({ upstream: { servers: [{ host: 'a:8080' }], strategy: 'least_conn' }, servers: [{ serverName: 'x.com', listen: 80, proxyPass: 'http://backend' }] })
    expect(r.status).toBe('ok')
    if (r.status === 'ok') {
      expect(r.data).toContain('upstream backend')
      expect(r.data).toContain('least_conn')
      expect(r.data).toContain('server a:8080;')
    }
  })
  it('empty server_name → invalid-input', () => {
    const r = generateNginxConfig({ servers: [{ serverName: '', listen: 80 }] })
    expect(r.status).toBe('error')
  })
})

describe('validateNginxConfig', () => {
  it('flags ssl server missing cert paths', () => {
    expect(validateNginxConfig({ servers: [{ serverName: 'x.com', listen: 443, ssl: true }] }).some((p) => p.includes('证书'))).toBe(true)
  })
  it('flags proxy_pass referencing undefined upstream', () => {
    expect(validateNginxConfig({ servers: [{ serverName: 'x.com', listen: 80, proxyPass: 'http://backend' }] }).some((p) => p.includes('upstream'))).toBe(true)
  })
  it('flags root+proxyPass on same server', () => {
    expect(validateNginxConfig({ servers: [{ serverName: 'x.com', listen: 80, root: '/var/www', proxyPass: 'http://b' }] }).some((p) => p.includes('root') && p.includes('proxy'))).toBe(true)
  })
  it('empty input ok', () => { expect(validateNginxConfig({ servers: [] })).toEqual([]) })
})
