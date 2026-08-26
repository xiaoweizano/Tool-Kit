import { storageGet, storageSet } from './storage'

export interface EngineKeys { appid?: string; secret?: string; apiKey?: string }
export type TranslateKeys = Record<string, EngineKeys>
const KEY = 'toolkit.translate-keys'

export function getKeys(): TranslateKeys {
  return storageGet<TranslateKeys>(KEY, {})
}
export function setKeys(patch: TranslateKeys): void {
  storageSet(KEY, { ...getKeys(), ...patch })
}
