export const releasesUrl = 'https://github.com/toolkit-dev/toolkit/releases'
const REPO_API = 'https://api.github.com/repos/toolkit-dev/toolkit/releases/latest'
export interface ReleaseInfo { tag_name: string; html_url: string }
export async function latestReleaseApi(): Promise<ReleaseInfo | null> {
  try {
    const res = await fetch(REPO_API, { headers: { 'User-Agent': 'toolkit' } })
    if (!res.ok) return null
    return (await res.json()) as ReleaseInfo
  } catch { return null }
}
