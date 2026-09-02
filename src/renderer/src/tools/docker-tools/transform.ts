import type { ToolResult } from '@core/types'
import type { RunOptions, ComposeService, DockerfileOptions, ParsedImageName, ParsedRegistryUrl } from './types'
export { DOCKER_COMMANDS } from './data/commands'

export function generateRun(o: RunOptions): ToolResult<string> {
  if (!o.image.trim()) return { status: 'error', kind: 'invalid-input', message: '请填写镜像名' }
  const parts = ['docker run']
  if (o.name) parts.push(`--name ${o.name}`)
  if (o.restart) parts.push(`--restart ${o.restart}`)
  if (o.network) parts.push(`--network ${o.network}`)
  o.ports.forEach((p) => parts.push(`-p ${p}`))
  o.volumes.forEach((v) => parts.push(`-v ${v}`))
  o.envs.forEach((e) => parts.push(`-e ${e}`))
  parts.push(o.image)
  return { status: 'ok', data: parts.join(' ') }
}

export function generateCompose(services: ComposeService[]): ToolResult<string> {
  if (!services.length) return { status: 'error', kind: 'invalid-input', message: '请至少添加一个服务' }
  const lines = ['version: "3.8"', 'services:']
  for (const s of services) {
    if (!s.name || !s.image) return { status: 'error', kind: 'invalid-input', message: `服务 ${s.name || '(未命名)'} 缺 name/image` }
    const b = [`  ${s.name}:`, `    image: ${s.image}`]
    if (s.ports?.length) b.push('    ports:', ...s.ports.map((p) => `      - "${p}"`))
    if (s.volumes?.length) b.push('    volumes:', ...s.volumes.map((v) => `      - "${v}"`))
    if (s.envs?.length) b.push('    environment:', ...s.envs.map((e) => `      - ${e}`))
    if (s.dependsOn?.length) b.push('    depends_on:', ...s.dependsOn.map((d) => `      - ${d}`))
    lines.push(...b)
  }
  return { status: 'ok', data: lines.join('\n') }
}

export function generateDockerfile(o: DockerfileOptions): ToolResult<string> {
  if (!o.base.trim()) return { status: 'error', kind: 'invalid-input', message: '请填写基础镜像' }
  const lines = [`FROM ${o.base}`]
  if (o.workdir) lines.push(`WORKDIR ${o.workdir}`)
  o.copy?.forEach((c) => lines.push(`COPY ${c.src} ${c.dest}`))
  o.run?.forEach((r) => lines.push(`RUN ${r}`))
  if (o.expose) lines.push(`EXPOSE ${o.expose}`)
  if (o.entrypoint) lines.push(`CMD ${o.entrypoint}`)
  return { status: 'ok', data: lines.join('\n') }
}

export function parseImageName(image: string): ToolResult<ParsedImageName> {
  const whole = image.trim()
  if (!whole) return { status: 'error', kind: 'invalid-input', message: '请输入镜像名' }
  const lastSlash = whole.lastIndexOf('/')
  const lastColon = whole.lastIndexOf(':')
  let tag = 'latest', base = whole
  if (lastColon > lastSlash) { tag = whole.slice(lastColon + 1); base = whole.slice(0, lastColon) }
  let registry: string | undefined, namespace: string | undefined, repo: string
  const firstSlash = base.indexOf('/')
  if (firstSlash < 0) { repo = base }
  else {
    const head = base.slice(0, firstSlash)
    const rest = base.slice(firstSlash + 1)
    if (head.includes('.') || head.includes(':') || head === 'localhost') {
      registry = head
      const sl = rest.indexOf('/')
      if (sl < 0) { namespace = undefined; repo = rest }
      else { namespace = rest.slice(0, sl); repo = rest.slice(sl + 1) }
    } else { namespace = head; repo = rest }
  }
  return { status: 'ok', data: { registry, namespace, repo, tag } }
}

export function parseRegistryUrl(url: string): ToolResult<ParsedRegistryUrl> {
  const t = url.trim()
  if (!t) return { status: 'error', kind: 'invalid-input', message: '请输入注册表地址' }
  const m = t.match(/^(https?|http)?(?::\/\/)?([^:/?#]+)(?::(\d+))?([^?#]*)/)
  if (!m) return { status: 'error', kind: 'invalid-input', message: 'URL 格式无效' }
  const scheme = m[1] === 'https' ? 'https' : m[1] === 'http' ? 'http' : 'https'
  return { status: 'ok', data: { scheme, host: m[2], port: m[3], path: m[4] || undefined } }
}
