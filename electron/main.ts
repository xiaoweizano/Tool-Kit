import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'node:path'
import { releasesUrl, latestReleaseApi } from './update'

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280, height: 800, minWidth: 1024, minHeight: 640,
    title: 'ToolKit',
    webPreferences: {
      preload: join(__dirname, '../preload/preload.mjs'),
      contextIsolation: true, nodeIntegration: false, sandbox: false
    }
  })
  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url); return { action: 'deny' }
  })
  if (process.env.ELECTRON_RENDERER_URL) {
    void win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    void win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

ipcMain.handle('check-update', async () => latestReleaseApi())
ipcMain.handle('open-releases', () => { void shell.openExternal(releasesUrl) })

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
