# config-generator-tools Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 3 offline config generators (docker-tools / nginx-generator / jvm-params) to ToolKit.

**Architecture:** All three are local button-triggered tools (id-generator pattern) — no worker. Each is a form → pure template-string function → `ToolResult<string>`. docker-tools is a 6-tab container (run/compose/Dockerfile/command-cheatsheet/image-parse/registry-parse) with a ≥50-entry command dataset.

**Tech Stack:** React 18, TypeScript, tailwind/daisyUI, vitest. No new runtime deps — all template strings.

## Global Constraints

- Output = `ToolResult<string>` / `ToolResult<Structured>` from `@core/types`.
- Local tools: import transform directly in `index.tsx`, DO NOT register in `transform.worker.ts`.
- Outputs follow best practices: Dockerfile multi-stage, compose `3.8`, nginx security headers + WebSocket headers, JVM container-aware flags.
- Chinese UI; DESIGN.md chrome; `CopyButton`; `TriStateOutput` for errors.
- Golden tests: `test/<id>.test.ts`, import `@tools/<id>/transform`, assert `ToolResult`.

---

## File Structure

```
src/renderer/src/tools/docker-tools/{icon.tsx, index.tsx, transform.ts, types.ts, data/commands.ts, components/{RunTab,ComposeTab,DockerfileTab,CheatSheetTab,ImageParseTab,RegistryParseTab}.tsx}
src/renderer/src/tools/nginx-generator/{icon.tsx, index.tsx, transform.ts, types.ts}
src/renderer/src/tools/jvm-params/{icon.tsx, index.tsx, transform.ts, types.ts}
src/renderer/src/tools/register.ts                 (modify)
test/docker-tools.test.ts
test/nginx-generator.test.ts
test/jvm-params.test.ts
```

---

## Task 1: Types

**Files:**
- Create: `src/renderer/src/tools/docker-tools/types.ts`
- Create: `src/renderer/src/tools/nginx-generator/types.ts`
- Create: `src/renderer/src/tools/jvm-params/types.ts`

**Interfaces:**
- Produces: `RunOptions`, `ComposeService`, `DockerfileOptions`, `ParsedImageName`, `ParsedRegistryUrl`; `NginxOptions`; `JvmOptions`.

- [ ] **Step 1: docker-tools types**

```ts
// src/renderer/src/tools/docker-tools/types.ts
export interface RunOptions { image: string; name?: string; ports: string[]; volumes: string[]; envs: string[]; restart?: string; network?: string }
export interface ComposeService { name: string; image: string; ports?: string[]; volumes?: string[]; envs?: string[]; dependsOn?: string[] }
export interface DockerfileOptions { base: string; workdir?: string; copy?: { src: string; dest: string }[]; run?: string[]; expose?: string; entrypoint?: string }
export interface ParsedImageName { registry?: string; namespace?: string; repo: string; tag: string }
export interface ParsedRegistryUrl { scheme: string; host: string; port?: string; path?: string }
```

- [ ] **Step 2: nginx types**

```ts
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
```

- [ ] **Step 3: jvm types**

```ts
// src/renderer/src/tools/jvm-params/types.ts
export type GcStrategy = 'g1' | 'zgc' | 'shenandoah'
export interface JvmOptions {
  xms?: string; xmx?: string; xmn?: string; metaspace?: string
  gc?: GcStrategy
  heapDump?: boolean; heapDumpPath?: string; remoteDebugPort?: string
  printGc?: boolean; jmxPort?: string; flightRecorder?: boolean
  container?: boolean; extra: string[]
}
```

- [ ] **Step 4: Commit**

```bash
git add src/renderer/src/tools/docker-tools/types.ts src/renderer/src/tools/nginx-generator/types.ts src/renderer/src/tools/jvm-params/types.ts
git commit -m "chore: config-generator tool types"
```

---

## Task 2: docker-tools transforms (TDD)

**Files:**
- Create: `src/renderer/src/tools/docker-tools/transform.ts`
- Test: `test/docker-tools.test.ts`

**Interfaces:**
- Produces: `generateRun`, `generateCompose`, `generateDockerfile`, `parseImageName`, `parseRegistryUrl`, `DOCKER_COMMANDS`.

- [ ] **Step 1: Write the failing test**

```ts
// test/docker-tools.test.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test test/docker-tools.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement transforms**

```ts
// src/renderer/src/tools/docker-tools/transform.ts
import type { ToolResult } from '@core/types'
import type { RunOptions, ComposeService, DockerfileOptions, ParsedImageName, ParsedRegistryUrl } from './types'
import { DOCKER_COMMANDS } from './data/commands'
export type { DOCKER_COMMANDS as DOCKER_COMMANDS_TYPE }

const kv = (k: string, v: string): string => (v ? ` ${k} ${v}` : '')

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

const yaml = (s: string): string => '  ' + s.split('\n').join('\n  ')

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
  const t = image.trim()
  if (!t) return { status: 'error', kind: 'invalid-input', message: '请输入镜像名' }
  let [name, tag = 'latest'] = t.split(':')
  if (tag === '') { tag = 'latest'; name = t }
  let registry: string | undefined, ns: string | undefined
  const slash = name.lastIndexOf('/')
  if (slash >= 0) {
    const head = name.slice(0, slash), repo = name.slice(slash + 1)
    const hasDotOrPort = head.includes('.') || head.includes(':'); // registry host if it has a dot or port
    if (hasDotOrPort) { registry = head; ns = repo }
    else { ns = head; repo = repo }
    name = ns + '/' + repo
    registry = registry
  }
  const parts = t.length ? t : ''
  // normalize: registry / namespace / repo / tag
  let r: string | undefined, n: string | undefined, repo: string
  const whole = image.trim()
  const lastSlash = whole.lastIndexOf('/')
  const lastColon = whole.lastIndexOf(':')
  // tag = after last colon, but only if it appears after last slash
  let tagVal = 'latest'
  let base = whole
  if (lastColon > lastSlash) { tagVal = whole.slice(lastColon + 1); base = whole.slice(0, lastColon) }
  const firstSlash = base.indexOf('/')
  if (firstSlash < 0) { repo = base }
  else {
    const head = base.slice(0, firstSlash)
    const rest = base.slice(firstSlash + 1)
    if (head.includes('.') || head.includes(':') || head === 'localhost') { r = head; const sl = rest.indexOf('/'); if (sl < 0) { n = undefined; repo = rest } else { n = rest.slice(0, sl); repo = rest.slice(sl + 1) } }
    else { n = head; repo = rest }
  }
  return { status: 'ok', data: { registry: r, namespace: n, repo, tag: tagVal } }
}

export function parseRegistryUrl(url: string): ToolResult<ParsedRegistryUrl> {
  const t = url.trim()
  if (!t) return { status: 'error', kind: 'invalid-input', message: '请输入注册表地址' }
  const m = t.match(/^(https?|http)?(?::\/\/)?([^:/?#]+)(?::(\d+))?([^?#]*)/)
  if (!m) return { status: 'error', kind: 'invalid-input', message: 'URL 格式无效' }
  const scheme = m[1] === 'https' ? 'https' : m[1] === 'http' ? 'http' : 'https'
  return { status: 'ok', data: { scheme, host: m[2], port: m[3], path: m[4] || undefined } }
}
```

> Note: the `parseImageName` first draft above is convoluted. Use the cleaner second half (from `const whole = image.trim()`). Replace the whole function body with:

```ts
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
```

- [ ] **Step 4: Create command dataset (≥50)**

```ts
// src/renderer/src/tools/docker-tools/data/commands.ts
export interface DockerCommand { name: string; desc: string; examples?: string[] }
// 10 类,每类 5-6 条,合计 ≥50。示例(类 1-2 给出,其余按同模式补足):
export const DOCKER_COMMANDS: DockerCommand[] = [
  { name: 'docker build', desc: '从 Dockerfile 构建镜像', examples: ['docker build -t myapp .'] },
  { name: 'docker run', desc: '从镜像运行容器', examples: ['docker run -d -p 8080:80 nginx'] },
  { name: 'docker ps', desc: '列出运行中的容器', examples: ['docker ps -a'] },
  { name: 'docker images', desc: '列出本地镜像' },
  { name: 'docker pull', desc: '拉取镜像', examples: ['docker pull nginx:alpine'] },
  { name: 'docker push', desc: '推送镜像到仓库', examples: ['docker push myapp:latest'] },
  { name: 'docker exec', desc: '在运行容器内执行命令', examples: ['docker exec -it app sh'] },
  { name: 'docker logs', desc: '查看容器日志', examples: ['docker logs -f app'] },
  { name: 'docker stop', desc: '停止容器' },
  { name: 'docker rm', desc: '删除容器', examples: ['docker rm -f app'] },
  { name: 'docker rmi', desc: '删除镜像' },
  { name: 'docker compose up', desc: '启动 compose 服务', examples: ['docker compose up -d'] },
  { name: 'docker compose down', desc: '停止 compose 服务' },
  { name: 'docker compose build', desc: '构建 compose 中的镜像' },
  { name: 'docker compose logs', desc: '查看 compose 服务日志' },
  { name: 'docker cp', desc: '容器与宿主机复制文件' },
  { name: 'docker inspect', desc: '查看容器/镜像详情' },
  { name: 'docker network ls', desc: '列出网络' },
  { name: 'docker volume ls', desc: '列出卷' },
  { name: 'docker stats', desc: '查看容器资源占用' },
  { name: 'docker system df', desc: '查看磁盘占用' },
  { name: 'docker system prune', desc: '清理未用资源' },
  { name: 'docker login', desc: '登录仓库', examples: ['docker login registry.example.com'] },
  { name: 'docker tag', desc: '给镜像打标签', examples: ['docker tag nginx:alpine myapp:1.0'] },
  { name: 'docker save', desc: '保存镜像为 tar', examples: ['docker save -o app.tar myapp'] },
  { name: 'docker load', desc: '从 tar 加载镜像' },
  { name: 'docker export', desc: '导出容器文件系统' },
  { name: 'docker import', desc: '导入容器 tar' },
  { name: 'docker attach', desc: '附加到运行容器' },
  { name: 'docker top', desc: '查看容器进程' },
  { name: 'docker port', desc: '查看端口映射' },
  { name: 'docker diff', desc: '查看容器文件变化' },
  { name: 'docker events', desc: '流式服务器事件' },
  { name: 'docker history', desc: '查看镜像历史' },
  { name: 'docker commit', desc: '从容器创建镜像' },
  { name: 'docker buildx build', desc: '多架构构建', examples: ['docker buildx build --platform linux/amd64,linux/arm64'] },
  { name: 'docker builder ls', desc: '列出构建器' },
  { name: 'docker manifest create', desc: '创建 manifest 列表' },
  { name: 'docker info', desc: '显示系统信息' },
  { name: 'docker version', desc: '显示版本' },
  { name: 'docker restart', desc: '重启容器' },
  { name: 'docker pause', desc: '暂停容器' },
  { name: 'docker unpause', desc: '取消暂停' },
  { name: 'docker kill', desc: '强制停止容器' },
  { name: 'docker wait', desc: '等待容器退出' },
  { name: 'docker rename', desc: '重命名容器' },
  { name: 'docker update', desc: '更新容器配置' },
  { name: 'docker seccomp', desc: 'seccomp 相关' },
  { name: 'docker checkpoint', desc: '创建检查点' },
  { name: 'docker plugin install', desc: '安装插件' },
  { name: 'docker trust sign', desc: '签名镜像' },
  { name: 'docker scan', desc: '扫描镜像漏洞' },
  { name: 'docker network connect', desc: '连接网络' },
  { name: 'docker network disconnect', desc: '断开网络' }
]
```
(Ensure ≥50; the above is 55.)

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test test/docker-tools.test.ts`
Expected: PASS (6 describes).

- [ ] **Step 6: Commit**

```bash
git add src/renderer/src/tools/docker-tools test/docker-tools.test.ts
git commit -m "feat(docker-tools): run/compose/dockerfile/parse + command data"
```

---

## Task 3: nginx-generator transform (TDD)

**Files:**
- Create: `src/renderer/src/tools/nginx-generator/transform.ts`
- Test: `test/nginx-generator.test.ts`

**Interfaces:**
- Produces: `generateNginxConfig(options: NginxOptions): ToolResult<string>`.

- [ ] **Step 1: Write the failing test**

```ts
// test/nginx-generator.test.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test test/nginx-generator.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
// src/renderer/src/tools/nginx-generator/transform.ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test test/nginx-generator.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/tools/nginx-generator/transform.ts test/nginx-generator.test.ts
git commit -m "feat(nginx-generator): feature-flag conf generator"
```

---

## Task 4: jvm-params transform (TDD)

**Files:**
- Create: `src/renderer/src/tools/jvm-params/transform.ts`
- Test: `test/jvm-params.test.ts`

**Interfaces:**
- Produces: `generateJvmParams(options: JvmOptions): ToolResult<string>`.

- [ ] **Step 1: Write the failing test**

```ts
// test/jvm-params.test.ts
import { describe, it, expect } from 'vitest'
import { generateJvmParams } from '@tools/jvm-params/transform'

describe('generateJvmParams', () => {
  it('heap flags', () => {
    const r = generateJvmParams({ extra: [] })
    expect(r.status).toBe('ok')
  })
  it('includes g1 when chosen', () => {
    const r = generateJvmParams({ gc: 'g1', extra: [] })
    if (r.status !== 'ok') throw new Error('err')
    expect(r.data).toContain('-XX:+UseG1GC')
  })
  it('container flags', () => {
    const r = generateJvmParams({ container: true, xmx: '2g', extra: [] })
    if (r.status !== 'ok') throw new Error('err')
    expect(r.data).toContain('UseContainerSupport')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test test/jvm-params.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
// src/renderer/src/tools/jvm-params/transform.ts
import type { ToolResult } from '@core/types'
import type { JvmOptions } from './types'

const GC = {
  g1: ['-XX:+UseG1GC', '-XX:MaxGCPauseMillis=100'],
  zgc: ['-XX:+UseZGC', '-XX:+UnlockExperimentalVMOptions'],
  shenandoah: ['-XX:+UseShenandoahGC']
}

export function generateJvmParams(o: JvmOptions): ToolResult<string> {
  const rows: { flag: string; note: string }[] = []
  if (o.xms) rows.push({ flag: `-Xms${o.xms}`, note: '初始堆大小' })
  if (o.xmx) rows.push({ flag: `-Xmx${o.xmx}`, note: '最大堆大小' })
  if (o.xmn) rows.push({ flag: `-Xmn${o.xmn}`, note: '新生代大小' })
  if (o.metaspace) rows.push({ flag: `-XX:MetaspaceSize=${o.metaspace}`, note: '元空间大小' })
  if (o.gc) for (const f of GC[o.gc]) rows.push({ flag: f, note: `${o.gc.toUpperCase()} 垃圾回收器` })
  if (o.heapDump) rows.push({ flag: '-XX:+HeapDumpOnOutOfMemoryError', note: 'OOM 时堆转储' })
  if (o.heapDumpPath) rows.push({ flag: `-XX:HeapDumpPath=${o.heapDumpPath}`, note: '转储路径' })
  if (o.remoteDebugPort) rows.push({ flag: `-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:${o.remoteDebugPort}`, note: '远程调试' })
  if (o.printGc) rows.push({ flag: '-XX:+PrintGCDetails', note: '打印 GC 详情' })
  if (o.jmxPort) rows.push({ flag: `-Dcom.sun.management.jmxremote.port=${o.jmxPort}`, note: 'JMX 端口' })
  if (o.flightRecorder) rows.push({ flag: '-XX:+FlightRecorder', note: 'JFR 采样' })
  if (o.container) rows.push({ flag: '-XX:+UseContainerSupport', note: '容器感知' })
  if (o.container && o.xmx) rows.push({ flag: '-XX:MaxRAMPercentage=75.0', note: '容器内按可用内存百分比' })
  for (const e of o.extra.filter(Boolean)) rows.push({ flag: e, note: '自定义' })
  if (rows.length === 0) return { status: 'error', kind: 'invalid-input', message: '请选择至少一个参数' }
  const text = rows.map((r) => `${r.flag}   # ${r.note}`).join('\n')
  return { status: 'ok', data: text }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test test/jvm-params.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/tools/jvm-params/transform.ts test/jvm-params.test.ts
git commit -m "feat(jvm-params): categorized JVM flag generator"
```

---

## Task 5: register.ts + pages + icons

**Files:**
- Modify: `src/renderer/src/tools/register.ts`
- Create: `src/renderer/src/tools/docker-tools/{icon.tsx,index.tsx,components/*}`
- Create: `src/renderer/src/tools/nginx-generator/{icon.tsx,index.tsx}`
- Create: `src/renderer/src/tools/jvm-params/{icon.tsx,index.tsx}`

- [ ] **Step 1: Icons**

```tsx
export function DockerIcon(): JSX.Element { return <span className="font-mono text-[11px]">{'🐳'}</span> }
export function NginxIcon(): JSX.Element { return <span className="font-mono text-[11px]">{'ngx'}</span> }
export function JvmIcon(): JSX.Element { return <span className="font-mono text-[11px]">{'JVM'}</span> }
```

- [ ] **Step 2: register.ts**

```ts
import { DockerIcon } from '@tools/docker-tools/icon'
import { NginxIcon } from '@tools/nginx-generator/icon'
import { JvmIcon } from '@tools/jvm-params/icon'
const DockerToolsPageLazy = lazy(() => import('@tools/docker-tools'))
const NginxGeneratorPageLazy = lazy(() => import('@tools/nginx-generator'))
const JvmParamsPageLazy = lazy(() => import('@tools/jvm-params'))
```
Append:
```ts
{ id: 'docker-tools', name: 'Docker 生成', icon: DockerIcon, route: '/tools/docker-tools', component: DockerToolsPageLazy, capability: { offline: true } },
{ id: 'nginx-generator', name: 'nginx 配置', icon: NginxIcon, route: '/tools/nginx-generator', component: NginxGeneratorPageLazy, capability: { offline: true } },
{ id: 'jvm-params', name: 'JVM 参数', icon: JvmIcon, route: '/tools/jvm-params', component: JvmParamsPageLazy, capability: { offline: true } }
```

- [ ] **Step 3: docker-tools page (6 tabs)**

```tsx
// src/renderer/src/tools/docker-tools/index.tsx
import { useState } from 'react'
import { generateRun, generateCompose, generateDockerfile, parseImageName, parseRegistryUrl, DOCKER_COMMANDS } from './transform'
import { CopyButton } from '@components/CopyButton'

export default function DockerToolsPage(): JSX.Element {
  const [tab, setTab] = useState<'run'|'compose'|'dockerfile'|'cheatsheet'|'imgparse'|'regparse'>('run')
  const tabs = [['run','Docker Run'],['compose','Compose'],['dockerfile','Dockerfile'],['cheatsheet','命令速查'],['imgparse','镜像名解析'],['regparse','注册表']] as const
  return (
    <div className="mx-auto max-w-5xl p-6">
      <header className="mb-4 flex items-baseline gap-3"><h1 className="text-2xl font-bold">Docker 生成</h1><span className="font-mono text-[11px] tracking-[0.25em] text-neutral">RUN · COMPOSE · DOCKERFILE</span></header>
      <div className="mb-3 flex flex-wrap gap-2">{tabs.map(([id, label]) => <button key={id} className={`btn btn-sm ${tab===id?'btn-primary':'btn-ghost'}`} onClick={() => setTab(id)}>{label}</button>)}</div>
      <section className="border border-base-300 bg-base-200/40 p-4">
        {tab === 'run' && <RunTab />}
        {tab === 'compose' && <ComposeTab />}
        {tab === 'dockerfile' && <DockerfileTab />}
        {tab === 'cheatsheet' && <CheatSheetTab />}
        {tab === 'imgparse' && <ImageParseTab />}
        {tab === 'regparse' && <RegistryParseTab />}
      </section>
    </div>
  )
}
```
Each tab component: minimal form + button that calls its transform and renders output with `CopyButton`. Write `RunTab` fully; the rest follow the same skeleton (see Step 4).

```tsx
// src/renderer/src/tools/docker-tools/components/RunTab.tsx
import { useState } from 'react'
import { CopyButton } from '@components/CopyButton'
import { generateRun } from '../transform'

export function RunTab(): JSX.Element {
  const [image, setImage] = useState(''); const [ports, setPorts] = useState(''); const [restart, setRestart] = useState('')
  const [out, setOut] = useState(''); const [err, setErr] = useState('')
  const gen = (): void => { const r = generateRun({ image, ports: ports.split('\n').filter(Boolean), volumes: [], envs: [], restart: restart || undefined }); r.status === 'ok' ? (setOut(r.data), setErr('')) : (setErr(r.message), setOut('')) }
  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-sm text-neutral">镜像
        <input value={image} onChange={(e) => setImage(e.target.value)} placeholder="nginx:alpine" className="input input-bordered input-sm flex-1 font-mono" /></label>
      <label className="flex items-center gap-2 text-sm text-neutral">端口映射(每行 <span className="font-mono">宿主:容器</span>)
        <textarea value={ports} onChange={(e) => setPorts(e.target.value)} placeholder="8080:80" className="textarea textarea-bordered textarea-sm flex-1 font-mono" rows={2} /></label>
      <label className="flex items-center gap-2 text-sm text-neutral">restart
        <select className="select select-bordered select-sm" value={restart} onChange={(e) => setRestart(e.target.value)}><option value="">无</option><option>unless-stopped</option><option>always</option><option>on-failure</option></select></label>
      <button className="btn btn-sm btn-primary" onClick={gen}>生成</button>
      {err && <div className="text-error text-sm">{err}</div>}
      {out && <div className="flex items-center gap-2"><pre className="flex-1 overflow-auto rounded bg-base-100 p-2 font-mono text-sm">{out}</pre><CopyButton getText={() => out} enabled /></div>}
    </div>
  )
}
```
For ComposeTab/DockerfileTab/ImageParseTab/RegistryParseTab/CheatSheetTab, mirror the RunTab skeleton calling their transform function. CheatSheetTab renders `DOCKER_COMMANDS` filtered by a search box.

- [ ] **Step 4: nginx-generator page**

```tsx
// src/renderer/src/tools/nginx-generator/index.tsx
import { useState } from 'react'
import { generateNginxConfig } from './transform'
import { CopyButton } from '@components/CopyButton'

export default function NginxGeneratorPage(): JSX.Element {
  const [f, setF] = useState({ serverName: '', listen: 80, root: '', proxyPass: '', websocket: false, sslCert: '', sslKey: '', forceHttps: false, hsts: false, cache: false, gzip: false, securityHeaders: false, upstream: { servers: [], strategy: 'round_robin' as const } })
  const [out, setOut] = useState(''); const [err, setErr] = useState('')
  const gen = (): void => { const r = generateNginxConfig(f); r.status === 'ok' ? (setOut(r.data), setErr('')) : (setErr(r.message), setOut('')) }
  const set = (patch: Partial<typeof f>): void => setF({ ...f, ...patch })
  return (
    <div className="mx-auto max-w-5xl p-6">
      <header className="mb-4 flex items-baseline gap-3"><h1 className="text-2xl font-bold">nginx 配置生成</h1><span className="font-mono text-[11px] tracking-[0.25em] text-neutral">SERVER · SSL · PROXY · GZIP</span></header>
      <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
        <section className="border border-base-300 bg-base-200/40 p-4 space-y-2">
          <label className="flex items-center gap-2 text-sm">server_name <input className="input input-bordered input-sm flex-1 font-mono" value={f.serverName} onChange={(e) => set({ serverName: e.target.value })} /></label>
          <label className="flex items-center gap-2 text-sm">listen <input className="input input-bordered input-sm w-20 font-mono" value={f.listen} onChange={(e) => set({ listen: Number(e.target.value) })} /></label>
          <label className="flex items-center gap-2 text-sm">root <input className="input input-bordered input-sm flex-1 font-mono" value={f.root} onChange={(e) => set({ root: e.target.value })} /></label>
          <label className="flex items-center gap-2 text-sm">proxy_pass <input className="input input-bordered input-sm flex-1 font-mono" value={f.proxyPass} onChange={(e) => set({ proxyPass: e.target.value })} /></label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.websocket} onChange={(e) => set({ websocket: e.target.checked })} />WebSocket</label>
          <label className="flex items-center gap-2 text-sm">ssl_cert <input className="input input-bordered input-sm flex-1 font-mono" value={f.sslCert} onChange={(e) => set({ sslCert: e.target.value })} /></label>
          <label className="flex items-center gap-2 text-sm">ssl_key <input className="input input-bordered input-sm flex-1 font-mono" value={f.sslKey} onChange={(e) => set({ sslKey: e.target.value })} /></label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.forceHttps} onChange={(e) => set({ forceHttps: e.target.checked })} />强制 HTTPS</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.gzip} onChange={(e) => set({ gzip: e.target.checked })} />gzip</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.securityHeaders} onChange={(e) => set({ securityHeaders: e.target.checked })} />安全头</label>
          <button className="btn btn-sm btn-primary" onClick={gen}>生成</button>
        </section>
        <section className="border border-base-300 bg-base-200/40 p-4">{err ? <div className="text-error text-sm">{err}</div> : out ? <div className="flex items-start gap-2"><pre className="flex-1 overflow-auto rounded bg-base-100 p-2 font-mono text-xs">{out}</pre><CopyButton getText={() => out} enabled /></div> : <p className="text-sm text-neutral">填写左侧选项,点「生成」得到 nginx 配置…</p>}</section>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: jvm-params page**

```tsx
// src/renderer/src/tools/jvm-params/index.tsx
import { useState } from 'react'
import { generateJvmParams } from './transform'
import { CopyButton } from '@components/CopyButton'

export default function JvmParamsPage(): JSX.Element {
  const [f, setF] = useState({ xms: '', xmx: '', xmn: '', metaspace: '', gc: '' as '' | 'g1' | 'zgc' | 'shenandoah', heapDump: false, heapDumpPath: '', remoteDebugPort: '', printGc: false, jmxPort: '', flightRecorder: false, container: false, extra: '' })
  const [out, setOut] = useState(''); const [err, setErr] = useState('')
  const gen = (): void => { const r = generateJvmParams({ xms: f.xms || undefined, xmx: f.xmx || undefined, xmn: f.xmn || undefined, metaspace: f.metaspace || undefined, gc: f.gc || undefined, heapDump: f.heapDump, heapDumpPath: f.heapDumpPath || undefined, remoteDebugPort: f.remoteDebugPort || undefined, printGc: f.printGc, jmxPort: f.jmxPort || undefined, flightRecorder: f.flightRecorder, container: f.container, extra: f.extra.split('\n') }); r.status === 'ok' ? (setOut(r.data), setErr('')) : (setErr(r.message), setOut('')) }
  const set = (patch: Partial<typeof f>): void => setF({ ...f, ...patch })
  const field = (label: string, key: keyof typeof f): JSX.Element => <label className="flex items-center gap-2 text-sm">{label}<input className="input input-bordered input-sm w-32 font-mono" value={String(f[key])} onChange={(e) => set({ [key]: e.target.value } as Partial<typeof f>)} /></label>
  return (
    <div className="mx-auto max-w-4xl p-6">
      <header className="mb-4 flex items-baseline gap-3"><h1 className="text-2xl font-bold">JVM 参数生成</h1><span className="font-mono text-[11px] tracking-[0.25em] text-neutral">HEAP · GC · DEBUG · MONITOR</span></header>
      <section className="border border-base-300 bg-base-200/40 p-4 space-y-2">
        <div className="flex flex-wrap gap-3">{field('Xms', 'xms')}{field('Xmx', 'xmx')}{field('Xmn', 'xmn')}{field('Metaspace', 'metaspace')}</div>
        <label className="flex items-center gap-2 text-sm">GC<select className="select select-bordered select-sm" value={f.gc} onChange={(e) => set({ gc: e.target.value as any })}><option value="">无</option><option value="g1">G1</option><option value="zgc">ZGC</option><option value="shenandoah">Shenandoah</option></select></label>
        <div className="flex flex-wrap gap-3">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.heapDump} onChange={(e) => set({ heapDump: e.target.checked })} />OOM 堆转储</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.printGc} onChange={(e) => set({ printGc: e.target.checked })} />打印 GC</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.flightRecorder} onChange={(e) => set({ flightRecorder: e.target.checked })} />JFR</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.container} onChange={(e) => set({ container: e.target.checked })} />容器感知</label>
        </div>
        <div className="flex flex-wrap gap-3">{field('HeapDumpPath', 'heapDumpPath')}{field('远程调试端口', 'remoteDebugPort')}{field('JMX 端口', 'jmxPort')}</div>
        <textarea value={f.extra} onChange={(e) => set({ extra: e.target.value })} placeholder="自定义参数(每行一个,如 -Dspring.profiles.active=prod)" className="textarea textarea-bordered textarea-sm w-full font-mono" rows={2} />
        <button className="btn btn-sm btn-primary" onClick={gen}>生成</button>
      </section>
      <div className="mt-4">{err ? <div className="text-error text-sm">{err}</div> : out ? <div className="flex items-start gap-2"><pre className="flex-1 overflow-auto rounded bg-base-100 p-2 font-mono text-sm">{out}</pre><CopyButton getText={() => out} enabled /></div> : null}</div>
    </div>
  )
}
```

- [ ] **Step 6: Run typecheck + lint**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/renderer/src/tools/docker-tools src/renderer/src/tools/nginx-generator src/renderer/src/tools/jvm-params src/renderer/src/tools/register.ts
git commit -m "feat: docker-tools/nginx-generator/jvm-params pages"
```

---

## Task 6: Full verification

**Files:**
- Create: `docs/spec-checklist-config-generator-tools.md`

- [ ] **Step 1: Run tests**

Run: `pnpm test`
Expected: all green.

- [ ] **Step 2: typecheck + lint**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS.

- [ ] **Step 3: Manual UI smoke**

Run: `pnpm dev:web`; verify docker Run/Compose/Dockerfile/cheatsheet/parse; nginx server/proxy/SSL/gzip/security; JVM heap/GC/container/custom. Confirm no network.

- [ ] **Step 4: Validate change**

Run: `openspec validate config-generator-tools`
Expected: valid.

- [ ] **Step 5: Commit**

```bash
git add openspec/changes/config-generator-tools/docs docs/spec-checklist-config-generator-tools.md
git commit -m "chore(config-generator-tools): spec-checklist + progress"
```
