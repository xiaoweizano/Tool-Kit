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
})
