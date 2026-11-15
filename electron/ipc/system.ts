import { ipcMain, Notification, shell } from 'electron'
import { IPC } from '../bridge'

const SYSTEM_PREFIX = /^(https?:|mailto:)/i

export function registerSystemIpc(): void {
  ipcMain.handle(IPC.notify, (_event, payload: { title: string; body: string }) => {
    if (!Notification.isSupported()) return
    new Notification({ title: payload.title, body: payload.body }).show()
  })

  ipcMain.handle(IPC.openExternal, async (_event, url: string) => {
    if (!SYSTEM_PREFIX.test(url)) return
    await shell.openExternal(url)
  })
}
