import { cpSync, readFileSync, writeFileSync } from 'node:fs'
import { relaxConnectSrc } from './relax-csp.mjs'

cpSync('out/renderer', 'dist/web', { recursive: true })

// Web-only CSP 放宽:桌面版从 out/renderer 加载,其逐域 connect-src 保持不动;
// 仅对复制到 dist/web 的产物把 connect-src 放开到 *,否则浏览器会在 CORS 之前
// 先被 CSP 拦死每个跨域请求(此脚本只在 build:web 运行,build:desktop 不经过它)。
// 放宽规则单一来源 scripts/relax-csp.mjs(与 vite.web.config.ts 的 dev:web 共用,指令缺失即抛错)。
const htmlPath = 'dist/web/index.html'
const html = readFileSync(htmlPath, 'utf8')
writeFileSync(htmlPath, relaxConnectSrc(html))
console.log('web build copied to dist/web (CSP connect-src relaxed to * for web only)')
