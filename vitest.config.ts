import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'
export default defineConfig({
  resolve: { alias: { '@': resolve('src/renderer/src'), '@core': resolve('src/renderer/src/core') } },
  test: { environment: 'node', include: ['test/**/*.test.ts'] }
})
