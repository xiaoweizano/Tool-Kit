// 自定义主题:运行时以 <html> 内联 CSS 变量覆盖 toolkit-custom 主题块的默认值
export interface CustomThemeVars {
  base100: string
  baseContent: string
  primary: string
  error: string
  warning: string
  success: string
}

export const DEFAULT_CUSTOM_VARS: CustomThemeVars = {
  base100: '#0A0A0A', baseContent: '#F4F1EA', primary: '#F4F1EA',
  error: '#E30613', warning: '#FFB300', success: '#00A651'
}

function parseHex(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim())
  if (!m) return null
  const n = m[1]
  return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)]
}

const toHex2 = (v: number): string => Math.round(v).toString(16).padStart(2, '0')

// 向 target 混合 ratio(0=原色,1=target)
export function mixHex(from: string, target: string, ratio: number): string {
  const a = parseHex(from) ?? [0, 0, 0]
  const b = parseHex(target) ?? [0, 0, 0]
  const r = Math.min(1, Math.max(0, ratio))
  const out = a.map((v, i) => v + (b[i] - v) * r)
  return `#${toHex2(out[0])}${toHex2(out[1])}${toHex2(out[2])}`
}

// 反差文字:亮底黑字,深底骨白字(YIQ)
export function contrastText(hex: string): string {
  const [r, g, b] = parseHex(hex) ?? [0, 0, 0]
  const yiq = (r * 299 + g * 587 + b * 114) / 1000
  return yiq >= 128 ? '#0a0a0a' : '#f4f1ea'
}

export function deriveVars(v: CustomThemeVars): Record<string, string> {
  const norm = (hex: string): string => mixHex(hex, hex, 0)
  return {
    '--color-base-100': norm(v.base100),
    // 层面向文字色方向混合:深底变浅、亮底变深,保证边框/抬面始终可辨
    '--color-base-200': mixHex(v.base100, v.baseContent, 0.08),
    '--color-base-300': mixHex(v.base100, v.baseContent, 0.18),
    '--color-base-content': norm(v.baseContent),
    '--color-primary': norm(v.primary),
    '--color-primary-content': contrastText(v.primary),
    '--color-error': norm(v.error),
    '--color-error-content': contrastText(v.error),
    '--color-warning': norm(v.warning),
    '--color-warning-content': contrastText(v.warning),
    '--color-success': norm(v.success),
    '--color-success-content': contrastText(v.success)
  }
}

export const CUSTOM_VAR_KEYS = Object.keys(deriveVars(DEFAULT_CUSTOM_VARS))

export function applyCustomVars(v: CustomThemeVars): void {
  const el = document.documentElement
  for (const [k, val] of Object.entries(deriveVars(v))) el.style.setProperty(k, val)
  el.style.colorScheme = contrastText(v.base100) === '#f4f1ea' ? 'dark' : 'light'
}

export function clearCustomVars(): void {
  const el = document.documentElement
  for (const k of CUSTOM_VAR_KEYS) el.style.removeProperty(k)
  el.style.removeProperty('color-scheme')
}
