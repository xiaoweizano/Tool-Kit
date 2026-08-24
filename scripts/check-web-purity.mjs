// Web purity check: ensure dist/web bundles contain no Electron references.
// Matches all import/require string forms; per Task 12 amendment, actual vite
// minified output on this machine showed no `from"electron"` but we guard all shapes.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const root = process.argv[2] || 'dist/web'
const bad = []
function walk(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f)
    if (statSync(p).isDirectory()) walk(p)
    else if (/\.(js|mjs|html|css)$/.test(f)) {
      const src = readFileSync(p, 'utf8')
      if (/from\s*['"]electron['"]/.test(src) || /require\(\s*['"]electron['"]\s*\)/.test(src) || /import\s*\(\s*['"]electron['"]\s*\)/.test(src))
        bad.push(p)
    }
  }
}
walk(root)
if (bad.length) {
  console.error('ELECTRON REFERENCE FOUND:', bad)
  process.exit(1)
}
console.log('web purity OK')
