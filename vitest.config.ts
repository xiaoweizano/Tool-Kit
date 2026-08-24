import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'
export default defineConfig({
  resolve: { alias: {
    '@': resolve('src/renderer/src'),
    '@core': resolve('src/renderer/src/core'),
    '@pages': resolve('src/renderer/src/pages'),
    '@tools': resolve('src/renderer/src/tools'),
      '@app': resolve('src/renderer/src/app'),
      '@components': resolve('src/renderer/src/components')
  } },
  test: { environment: 'node', include: ['test/**/*.test.ts', 'test/**/*.test.tsx'], setupFiles: ['test/setup.ts'] }
})
