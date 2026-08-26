import { contextBridge, ipcRenderer } from 'electron'
contextBridge.exposeInMainWorld('toolkitAPI', {
  openExternal: (url: string) => ipcRenderer.invoke('open-releases', url),
  checkUpdate: () => ipcRenderer.invoke('check-update'),
  netFetch: (payload: { url: string; init?: { method?: string; headers?: Record<string, string>; body?: string } }) =>
    ipcRenderer.invoke('net-fetch', payload)
})
