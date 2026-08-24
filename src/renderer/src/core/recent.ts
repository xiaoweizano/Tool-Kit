import { storageGet, storageSet, STORAGE_KEYS } from './storage'
import { tools } from '@tools/register'

const KEY = STORAGE_KEYS.settings + '.recent'
const MAX = 5

export function getRecent(): string[] {
  return storageGet<string[]>(KEY, []).filter((id) => tools.some((t) => t.id === id))
}

export function pushRecent(toolId: string): void {
  const next = [toolId, ...getRecent().filter((id) => id !== toolId)].slice(0, MAX)
  storageSet(KEY, next)
}
