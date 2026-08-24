// 一切持久化的单一出口(renderer 内禁止直接调 localStorage)
export const STORAGE_KEYS = { settings: 'toolkit.settings' } as const

export function storageGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}

export function storageSet(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* 存储满等异常静默,不影响功能 */ }
}

// 原始字符串读写:供 zustand createJSONStorage 使用(zustand 自行序列化,避免双重编码)
export function storageGetRaw(key: string): string | null {
  try { return localStorage.getItem(key) } catch { return null }
}

export function storageSetRaw(key: string, raw: string): void {
  try { localStorage.setItem(key, raw) } catch { /* 同上:静默 */ }
}

export function storageRemove(key: string): void {
  try { localStorage.removeItem(key) } catch { /* 同上:静默 */ }
}
