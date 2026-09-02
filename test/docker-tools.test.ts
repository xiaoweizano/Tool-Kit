import { describe, it, expect } from 'vitest'
import { generateRun, generateCompose, generateDockerfile, parseImageName, parseRegistryUrl, DOCKER_COMMANDS } from '@tools/docker-tools/transform'

describe('generateRun', () => {
  it('builds docker run command', () => {
    const r = generateRun({ image: 'nginx:alpine', ports: ['8080:80'], volumes: [], envs: [], restart: 'unless-stopped' })
    expect(r.status).toBe('ok')
    if (r.status === 'ok') { expect(r.data).toContain('docker run --restart unless-stopped -p 8080:80 nginx:alpine') }
  })
  it('missing image invalid', () => {
    const r = generateRun({ image: '', ports: [], volumes: [], envs: [] })
    expect(r.status).toBe('error')
    if (r.status === 'error') expect(r.kind).toBe('invalid-input')
  })
})

describe('generateCompose', () => {
  it('produces compose with one service', () => {
    const r = generateCompose([{ name: 'web', image: 'nginx:alpine', ports: ['8080:80'] }])
    expect(r.status).toBe('ok')
    if (r.status === 'ok') { expect(r.data).toContain('services:'); expect(r.data).toContain('web:') }
  })
  it('no services invalid', () => {
    const r = generateCompose([])
    expect(r.status).toBe('error')
    if (r.status === 'error') expect(r.kind).toBe('invalid-input')
  })
})

describe('parseImageName', () => {
  it('splits registry/namespace/repo/tag', () => {
    const r = parseImageName('registry.example.com:5000/ns/app:v2')
    if (r.status !== 'ok') throw new Error('err')
    expect(r.data).toEqual({ registry: 'registry.example.com:5000', namespace: 'ns', repo: 'app', tag: 'v2' })
  })
  it('defaults tag to latest', () => {
    const r = parseImageName('ubuntu')
    if (r.status !== 'ok') throw new Error('err')
    expect(r.data.tag).toBe('latest')
  })
})

describe('parseRegistryUrl', () => {
  it('splits url', () => {
    const r = parseRegistryUrl('https://registry.example.com:5000/v2')
    if (r.status !== 'ok') throw new Error('err')
    expect(r.data.host).toBe('registry.example.com')
    expect(r.data.port).toBe('5000')
  })
})

describe('generateDockerfile', () => {
  it('produces multi-stage dockerfile', () => {
    const r = generateDockerfile({ base: 'node:18-alpine', workdir: '/app', expose: '3000', entrypoint: 'npm start' })
    if (r.status !== 'ok') throw new Error('err')
    expect(r.data).toContain('FROM node:18-alpine')
    expect(r.data).toContain('EXPOSE 3000')
  })
  it('missing base invalid', () => {
    const r = generateDockerfile({ base: '' })
    expect(r.status).toBe('error')
  })
})

describe('DOCKER_COMMANDS data guard', () => {
  it('has >=50 entries, unique names, non-empty fields', () => {
    expect(DOCKER_COMMANDS.length).toBeGreaterThanOrEqual(50)
    const names = new Set(DOCKER_COMMANDS.map((c) => c.name))
    expect(names.size).toBe(DOCKER_COMMANDS.length)
    for (const c of DOCKER_COMMANDS) { expect(c.name.length).toBeGreaterThan(0); expect(c.desc.length).toBeGreaterThan(0) }
  })
})
