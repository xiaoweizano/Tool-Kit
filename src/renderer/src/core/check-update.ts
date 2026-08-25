export const APP_VERSION = '0.1.0' // 与 package.json 同步(构建期可改 vite define 注入)
const OWNER = 'xiaoweizano'
const REPO = 'Tool-Kit'
export const RELEASES_URL = `https://github.com/${OWNER}/${REPO}/releases`
const API = `https://api.github.com/repos/${OWNER}/${REPO}/releases/latest`

export type UpdateVerdict = 'newer' | 'same' | 'older' | 'unknown'

export function compareSemver(current: string, latest: string | null): UpdateVerdict {
  if (!latest) return 'unknown'
  const c = current.replace(/^v/, '').split('.').map(Number)
  const l = latest.replace(/^v/, '').split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    if (l[i] > c[i]) return 'newer'
    if (l[i] < c[i]) return 'older'
  }
  return 'same'
}

interface TkAPI { checkUpdate(): Promise<{ tag_name: string } | null>; openExternal(url: string): void }

export async function checkUpdate(): Promise<{ current: string; latest: string | null; verdict: UpdateVerdict }> {
  const api = (window as { toolkitAPI?: TkAPI }).toolkitAPI
  let tag: string | null = null
  try {
    if (api) tag = (await api.checkUpdate())?.tag_name ?? null
    else tag = (await (await fetch(API, { headers: { 'User-Agent': 'toolkit' } })).json())?.tag_name ?? null
  } catch { tag = null }
  return { current: APP_VERSION, latest: tag, verdict: compareSemver(APP_VERSION, tag) }
}

export function openReleases(): void {
  const api = (window as { toolkitAPI?: TkAPI }).toolkitAPI
  if (api) api.openExternal(RELEASES_URL)
  else window.open(RELEASES_URL, '_blank')
}
