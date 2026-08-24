import { contextBridge, ipcRenderer } from 'electron'
contextBridge.exposeInMainWorld('toolkitAPI', {
  openExternal: (url: string) => ipcRenderer.invoke('open-releases', url),
  checkUpdate: () => ipcRenderer.invoke('check-update')
})
