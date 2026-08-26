import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { storageGetRaw, storageSetRaw, storageRemove, STORAGE_KEYS } from './storage'
import { applyCustomVars, clearCustomVars, DEFAULT_CUSTOM_VARS, type CustomThemeVars } from './custom-theme'

export type ThemeName = 'toolkit-dark' | 'toolkit-paper' | 'toolkit-caramel' | 'toolkit-custom'

interface ThemeState {
  theme: ThemeName
  custom: CustomThemeVars
  setTheme: (t: ThemeName) => void
  setCustomVars: (patch: Partial<CustomThemeVars>) => void
  resetCustom: () => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'toolkit-dark',
      custom: DEFAULT_CUSTOM_VARS,
      setTheme: (theme) => {
        document.documentElement.dataset.theme = theme
        if (theme === 'toolkit-custom') applyCustomVars(get().custom)
        else clearCustomVars()
        set({ theme })
      },
      // 编辑自定义变量即时生效,并切换到自定义主题预览
      setCustomVars: (patch) => {
        const custom = { ...get().custom, ...patch }
        document.documentElement.dataset.theme = 'toolkit-custom'
        applyCustomVars(custom)
        set({ custom, theme: 'toolkit-custom' })
      },
      resetCustom: () => { get().setCustomVars(DEFAULT_CUSTOM_VARS) }
    }),
    {
      name: STORAGE_KEYS.settings,
      storage: createJSONStorage(() => ({
        getItem: (k) => storageGetRaw(k),
        setItem: (k, v) => storageSetRaw(k, v),
        removeItem: (k) => storageRemove(k)
      }))
    }
  )
)
