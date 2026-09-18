import type { RequestModel } from './types'

const sq = (s: string) => `'${s.replace(/'/g, "'\\''")}'`

export function buildCurl(req: RequestModel): string {
  const lines = [`curl ${sq(req.url)}`]
  if (req.method !== 'GET') lines.push(`  -X ${req.method}`)
  for (const h of req.headers) if (h.key) lines.push(`  -H ${sq(`${h.key}: ${h.value}`)}`)
  if (req.body) lines.push(`  --data-raw ${sq(req.body)}`)
  return lines.join(' \\\n')
}
