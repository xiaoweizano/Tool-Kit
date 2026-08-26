import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'node:path'
export default defineConfig({
  root: 'src/renderer',
  plugins: [react(), tailwindcss()],
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
