import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

export default defineConfig({
  main: { plugins: [externalizeDepsPlugin()], build: { rollupOptions: { input: { main: resolve('electron/main.ts') } } } },
  preload: { plugins: [externalizeDepsPlugin()], build: { rollupOptions: { input: { preload: resolve('electron/preload.ts') } } } },
  renderer: {
    root: 'src/renderer',
    plugins: [react()],
    resolve: {
      alias: {
        '@': resolve('src/renderer/src'),
        '@core': resolve('src/renderer/src/core'),
        '@pages': resolve('src/renderer/src/pages'),
        '@tools': resolve('src/renderer/src/tools'),
      '@app': resolve('src/renderer/src/app'),
      '@components': resolve('src/renderer/src/components')
      }
    }
  }
})
