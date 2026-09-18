const KEY = (id: string): string => `toolkit.deepLink.${id}`

export function writeDeepLink(targetId: string, payload: string): boolean {
  try {
    sessionStorage.setItem(KEY(targetId), payload)
    return true
  } catch {
    return false // 超配额:调用方降级(如仅传选中文本)
  }
}

export function readDeepLink(targetId: string): string | null {
  const k = KEY(targetId)
  const v = sessionStorage.getItem(k)
  if (v != null) sessionStorage.removeItem(k)
  return v
}
