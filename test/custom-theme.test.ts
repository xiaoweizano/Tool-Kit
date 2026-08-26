// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import {
  contrastText, mixHex, deriveVars, applyCustomVars, clearCustomVars, DEFAULT_CUSTOM_VARS
} from '@core/custom-theme'
import { useThemeStore } from '@core/theme-store'

describe('contrastText(反差文字)', () => {
  it('深底 → 骨白文字', () => { expect(contrastText('#0A0A0A')).toBe('#f4f1ea') })
  it('浅底 → 平黑文字', () => { expect(contrastText('#F4F1EA')).toBe('#0a0a0a') })
  it('信号红 → 骨白', () => { expect(contrastText('#E30613')).toBe('#f4f1ea') })
  it('琥珀 → 平黑', () => { expect(contrastText('#FFB300')).toBe('#0a0a0a') })
})

describe('mixHex(混色)', () => {
  it('黑向白 50% → 中灰', () => { expect(mixHex('#000000', '#ffffff', 0.5)).toBe('#808080') })
  it('比例 0 返回原色', () => { expect(mixHex('#123456', '#ffffff', 0)).toBe('#123456') })
  it('大写 hex 规范化为小写输出', () => { expect(mixHex('#ABCDEF', '#000000', 0)).toBe('#abcdef') })
})

describe('deriveVars(派生变量集)', () => {
  it('默认主题变量齐全,content 反差正确', () => {
    const vars = deriveVars(DEFAULT_CUSTOM_VARS)
    expect(vars['--color-base-100']).toBe('#0a0a0a')
    expect(vars['--color-base-content']).toBe('#f4f1ea')
    expect(vars['--color-primary-content']).toBe('#0a0a0a') // 骨白强调 → 黑字
    expect(vars['--color-base-200']).toMatch(/^#[0-9a-f]{6}$/)
    expect(vars['--color-base-300']).toMatch(/^#[0-9a-f]{6}$/)
    expect(Object.keys(vars)).toContain('--color-success-content')
  })
  it('base-200/300 向文字色方向混合(深底变浅)', () => {
    const vars = deriveVars(DEFAULT_CUSTOM_VARS)
    const b1 = parseInt(vars['--color-base-100'].slice(1, 3), 16)
    const b2 = parseInt(vars['--color-base-200'].slice(1, 3), 16)
    expect(b2).toBeGreaterThan(b1)
  })
})

describe('applyCustomVars / clearCustomVars(DOM 应用)', () => {
  beforeEach(() => clearCustomVars())
  it('应用后 documentElement 带内联变量,深底 colorScheme=dark', () => {
    applyCustomVars(DEFAULT_CUSTOM_VARS)
    expect(document.documentElement.style.getPropertyValue('--color-base-100')).toBe('#0a0a0a')
    expect(document.documentElement.style.colorScheme).toBe('dark')
  })
  it('亮底 → colorScheme=light', () => {
    applyCustomVars({ ...DEFAULT_CUSTOM_VARS, base100: '#F4F1EA', baseContent: '#1A1917' })
    expect(document.documentElement.style.colorScheme).toBe('light')
  })
  it('清除后变量移除', () => {
    applyCustomVars(DEFAULT_CUSTOM_VARS)
    clearCustomVars()
    expect(document.documentElement.style.getPropertyValue('--color-base-100')).toBe('')
  })
})

describe('theme store 自定义主题', () => {
  beforeEach(() => { useThemeStore.getState().setTheme('toolkit-dark') })
  it('setCustomVars 切到 custom 并应用内联变量', () => {
    useThemeStore.getState().setCustomVars({ base100: '#112233' })
    expect(useThemeStore.getState().theme).toBe('toolkit-custom')
    expect(document.documentElement.dataset.theme).toBe('toolkit-custom')
    expect(document.documentElement.style.getPropertyValue('--color-base-100')).toBe('#112233')
  })
  it('切回内置主题清除自定义变量', () => {
    useThemeStore.getState().setCustomVars({ base100: '#112233' })
    useThemeStore.getState().setTheme('toolkit-dark')
    expect(document.documentElement.style.getPropertyValue('--color-base-100')).toBe('')
    expect(document.documentElement.dataset.theme).toBe('toolkit-dark')
  })
  it('resetCustom 恢复默认并保持 custom 主题', () => {
    useThemeStore.getState().setCustomVars({ base100: '#112233' })
    useThemeStore.getState().resetCustom()
    expect(useThemeStore.getState().custom.base100).toBe(DEFAULT_CUSTOM_VARS.base100)
    expect(useThemeStore.getState().theme).toBe('toolkit-custom')
  })
})
