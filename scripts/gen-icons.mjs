// Generate platform icons (icon.ico / icon.icns + PNGs) from assets/icon.svg
// Replaces electron-icon-builder (its phantomjs-prebuilt dependency has a dead download CDN).
// Usage: pnpm icons
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'

const svg = readFileSync('assets/icon.svg')
const outDir = 'build/icons/icons'
mkdirSync(outDir, { recursive: true })

const sizes = [16, 24, 32, 48, 64, 96, 128, 256, 512, 1024]
const pngs = {}
for (const s of sizes) {
  const buf = await sharp(svg, { density: Math.max(72, (72 * s) / 128) })
    .resize(s, s).png().toBuffer()
  pngs[s] = buf
  writeFileSync(join(outDir, `${s}x${s}.png`), buf)
}

// --- ICO: container with embedded PNG entries ---
{
  const entries = [16, 24, 32, 48, 64, 96, 128, 256, 512].map((s) => pngs[s])
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0) // reserved
  header.writeUInt16LE(1, 2) // type: icon
  header.writeUInt16LE(entries.length, 4)
  const dirSize = 16 * entries.length
  let offset = 6 + dirSize
  const dir = Buffer.alloc(dirSize)
  entries.forEach((buf, i) => {
    const s = sizes[i]
    dir.writeUInt8(s >= 256 ? 0 : s, i * 16 + 0)
    dir.writeUInt8(s >= 256 ? 0 : s, i * 16 + 1)
    dir.writeUInt8(0, i * 16 + 2) // palette
    dir.writeUInt8(0, i * 16 + 3) // reserved
    dir.writeUInt16LE(1, i * 16 + 4) // planes
    dir.writeUInt16LE(32, i * 16 + 6) // bpp
    dir.writeUInt32LE(buf.length, i * 16 + 8)
    dir.writeUInt32LE(offset, i * 16 + 12)
    offset += buf.length
  })
  writeFileSync(join(outDir, 'icon.ico'), Buffer.concat([header, dir, ...entries]))
}

// --- ICNS: container with PNG entries (ic07..ic10, ic11/ic12 retina) ---
{
  const types = [
    ['ic07', 128], ['ic08', 256], ['ic09', 512], ['ic10', 1024],
    ['ic11', 32], ['ic12', 64], ['ic13', 256], ['ic14', 512],
  ]
  const chunks = []
  let total = 8
  for (const [type, s] of types) {
    const body = pngs[s]
    const head = Buffer.alloc(8)
    head.write(type, 0, 'ascii')
    head.writeUInt32BE(body.length + 8, 4)
    chunks.push(head, body)
    total += 8 + body.length
  }
  const container = Buffer.alloc(8)
  container.write('icns', 0, 'ascii')
  container.writeUInt32BE(total, 4)
  writeFileSync(join(outDir, 'icon.icns'), Buffer.concat([container, ...chunks]))
}

console.log(`icons generated in ${outDir} (ico/icns/png x${sizes.length})`)
