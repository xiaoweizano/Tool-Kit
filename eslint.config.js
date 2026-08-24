import tseslint from 'typescript-eslint'
export default tseslint.config(
  { ignores: ['out', 'dist', 'release', 'node_modules'] },
  ...tseslint.configs.recommended,
  {
    files: ['src/renderer/**'],
    rules: {
      'no-restricted-imports': ['error', { paths: [{ name: 'electron', message: 'renderer 环境无关:用 window.toolkitAPI 适配器' }] }]
    }
  }
)
