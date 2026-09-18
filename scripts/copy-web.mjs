import { cpSync, readFileSync, writeFileSync } from 'node:fs'
cpSync('out/renderer', 'dist/web', { recursive: true })

// Web-only CSP 放宽:桌面版从 out/renderer 加载,其逐域 connect-src 保持不动;
// 仅对复制到 dist/web 的产物把 connect-src 放开到 *,否则浏览器会在 CORS 之前
// 先被 CSP 拦死每个跨域请求(此脚本只在 build:web 运行,build:desktop 不经过它)。
// 与 vite.web.config.ts 的 transformIndexHtml(服务 dev:web)保持同一放宽规则。
// 注意:真实 index.html 中 connect-src 是最后一条指令、其后无 `;`(止于属性闭合引号),
// 故匹配止于 `;` 或 `"`,不能要求尾随分号——否则正则不命中、CSP 未被放宽。
const htmlPath = 'dist/web/index.html'
const html = readFileSync(htmlPath, 'utf8')
const relaxed = html.replace(/connect-src[^;"]*/, 'connect-src *')
if (relaxed === html) {
  throw new Error(`CSP relax failed: connect-src directive not found in ${htmlPath}`)
}
writeFileSync(htmlPath, relaxed)
console.log('web build copied to dist/web (CSP connect-src relaxed to * for web only)')
