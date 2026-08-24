import { cpSync } from 'node:fs'
cpSync('out/renderer', 'dist/web', { recursive: true })
console.log('web build copied to dist/web')
