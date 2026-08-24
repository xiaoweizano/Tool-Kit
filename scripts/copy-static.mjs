// Copy static (non-bundled) renderer assets into out/renderer.
// vite cannot bundle <script src="/set-theme.js"> without type="module";
// this script makes it present in both build channels (web + desktop).
import { copyFileSync, mkdirSync } from 'node:fs'
mkdirSync('out/renderer', { recursive: true })
copyFileSync('src/renderer/set-theme.js', 'out/renderer/set-theme.js')
console.log('set-theme.js copied to out/renderer')
