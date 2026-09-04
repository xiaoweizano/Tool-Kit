import { app, shell, BrowserWindow, ipcMain, net, Menu, dialog } from 'electron'
import { join } from 'node:path'
import { releasesUrl, latestReleaseApi } from './update'

// 中文菜单
const menuTemplate: Menu.BuildableMenuTemplateItem[] = [
  {
    label: '文件',
    submenu: [
      { label: '重新加载', accelerator: 'CmdOrCtrl+R', click: () => { const win = BrowserWindow.getFocusedWindow(); win?.reload() } },
      { type: 'separator' },
      { label: '退出', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() }
    ]
  },
  {
    label: '编辑',
    submenu: [
      { label: '撤销', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
      { label: '重做', accelerator: 'CmdOrCtrl+Shift+Z', role: 'redo' },
      { type: 'separator' },
      { label: '剪切', accelerator: 'CmdOrCtrl+X', role: 'cut' },
      { label: '复制', accelerator: 'CmdOrCtrl+C', role: 'copy' },
      { label: '粘贴', accelerator: 'CmdOrCtrl+V', role: 'paste' },
      { label: '全选', accelerator: 'CmdOrCtrl+A', role: 'selectAll' }
    ]
  },
  {
    label: '查看',
    submenu: [
      { label: '刷新', accelerator: 'CmdOrCtrl+R', click: () => { const win = BrowserWindow.getFocusedWindow(); win?.reload() } },
      { label: '重置缩放', accelerator: 'CmdOrCtrl+0', click: () => { const win = BrowserWindow.getFocusedWindow(); win?.webContents.setZoomFactor(1) } },
      { label: '放大', accelerator: 'CmdOrCtrl+=', click: () => { const win = BrowserWindow.getFocusedWindow(); win?.webContents.setZoomFactor(win.webContents.getZoomFactor() + 0.1) } },
      { label: '缩小', accelerator: 'CmdOrCtrl+-', click: () => { const win = BrowserWindow.getFocusedWindow(); win?.webContents.setZoomFactor(win.webContents.getZoomFactor() - 0.1) } },
      { type: 'separator' },
      { label: '切换全屏', accelerator: process.platform === 'darwin' ? 'Ctrl+Command+F' : 'F11', role: 'togglefullscreen' }
    ]
  },
  {
    label: '窗口',
    role: 'window',
    submenu: [
      { label: '最小化', role: 'minimize', accelerator: 'CmdOrCtrl+M' },
      { label: '关闭', role: 'close', accelerator: 'CmdOrCtrl+W' }
    ]
  },
  {
    label: '帮助',
    submenu: [
      {
        label: '检查更新',
        click: () => { ipcMain.emit('check-update'); shell.openExternal(releasesUrl) }
      },
      {
        label: '关于 ToolKit',
        click: () => { shell.openExternal('https://github.com/xiaoweizano/Tool-Kit') }
      }
    ]
  }
]

const menu = Menu.buildFromTemplate(menuTemplate)
Menu.setApplicationMenu(menu)

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280, height: 800, minWidth: 1024, minHeight: 640,
    title: 'ToolKit',
    frame: true,  // 显示原生窗口框架（包含关闭按钮）
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
ipcMain.handle('net-fetch', async (_e, payload: { url: string; init?: { method?: string; headers?: Record<string, string>; body?: string } }) => {
  const res = await net.fetch(payload.url, {
    method: payload.init?.method ?? 'GET',
    headers: payload.init?.headers,
    body: payload.init?.body
  })
  return { ok: res.ok, status: res.status, body: await res.text() }
})

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
