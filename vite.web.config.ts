import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
export default defineConfig({
  root: 'src/renderer',
  plugins: [react()],
  base: './',
  resolve: { alias: { '@': resolve('src/renderer/src') } },
  build: { outDir: '../../dist/web', emptyOutDir: true }
})
