import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { storageGetRaw, storageSetRaw, storageRemove, STORAGE_KEYS } from './storage'

export type ThemeName = 'toolkit-dark' | 'toolkit-paper' | 'toolkit-caramel'

interface ThemeState { theme: ThemeName; setTheme: (t: ThemeName) => void }

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'toolkit-dark',
      setTheme: (theme) => {
        document.documentElement.dataset.theme = theme
        set({ theme })
      }
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
