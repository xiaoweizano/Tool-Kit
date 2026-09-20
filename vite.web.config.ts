import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'node:path'
import { relaxConnectSrc } from './scripts/relax-csp.mjs'

// 仅 Web 产物:把 CSP 的 connect-src 放开到 *(桌面版走主进程 net.fetch 不受此限,
// 但 Web 版若沿用逐域白名单,每个跨域请求会在 CORS 之前先被 CSP 拦死,永远发不出去)。
// 本钩子服务 `dev:web`(vite --config vite.web.config.ts);`build:web` 走 electron-vite
// 渲染 + scripts/copy-web.mjs 复制,故构建产物的同一放宽在 copy-web.mjs 中落地。
// 放宽规则单一来源 scripts/relax-csp.mjs(与 copy-web.mjs 共用,指令缺失即抛错,不会静默 no-op)。
const relaxWebCsp = {
  name: 'relax-web-csp',
  transformIndexHtml(html: string): string {
    return relaxConnectSrc(html)
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
