import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'node:path'

// 仅 Web 产物:把 CSP 的 connect-src 放开到 *(桌面版走主进程 net.fetch 不受此限,
// 但 Web 版若沿用逐域白名单,每个跨域请求会在 CORS 之前先被 CSP 拦死,永远发不出去)。
// 本钩子服务 `dev:web`(vite --config vite.web.config.ts);`build:web` 走 electron-vite
// 渲染 + scripts/copy-web.mjs 复制,故构建产物的同一放宽在 copy-web.mjs 中落地。
// 注意:真实 index.html 中 connect-src 是最后一条指令,其后没有 `;`(止于属性闭合引号),
// 故匹配必须止于 `;` 或 `"`,不能要求尾随分号——否则正则不命中、CSP 未被放宽。
const relaxWebCsp = {
  name: 'relax-web-csp',
  transformIndexHtml(html: string): string {
    return html.replace(/connect-src[^;"]*/, 'connect-src *')
  }
}

export default defineConfig({
  root: 'src/renderer',
  plugins: [relaxWebCsp, react(), tailwindcss()],
  base: './',
  resolve: {
    alias: {
      '@': resolve('src/renderer/src'),
      '@core': resolve('src/renderer/src/core'),
      '@pages': resolve('src/renderer/src/pages'),
      '@tools': resolve('src/renderer/src/tools'),
      '@app': resolve('src/renderer/src/app'),
      '@components': resolve('src/renderer/src/components')
    }
  },
  build: { outDir: '../../dist/web', emptyOutDir: true }
})
