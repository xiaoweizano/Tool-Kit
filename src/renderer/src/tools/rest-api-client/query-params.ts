import type { KV } from './types'

/**
 * Manual query-string parse/serialize.
 *
 * MUST NOT use URL / URLSearchParams: those percent-encode `{` `}` and would
 * destroy `{{var}}` templates, and would also re-encode already-encoded values.
 * We split on the literal `?`, `&`, `=` characters instead.
 */
export function newKv(key = '', value = ''): KV {
  return { id: crypto.randomUUID(), key, value }
}

export function parseQuery(url: string): { base: string; params: KV[] } {
  const src = url ?? ''
  const i = src.indexOf('?')
  if (i === -1) return { base: src, params: [] }
  const base = src.slice(0, i)
  const params = src
    .slice(i + 1)
    .split('&')
    .filter((s) => s !== '')
    .map((seg) => {
      const eq = seg.indexOf('=')
      return eq === -1 ? newKv(seg, '') : newKv(seg.slice(0, eq), seg.slice(eq + 1))
    })
  return { base, params }
}

export function serializeQuery(base: string, params: KV[]): string {
  const q = params
    .filter((p) => p.key !== '')
    .map((p) => `${p.key}=${p.value}`)
    .join('&')
  return q ? `${base}?${q}` : base
}
