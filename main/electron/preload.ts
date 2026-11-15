import { contextBridge, ipcRenderer } from 'electron'
import { IPC, type ElectronBridgeApi } from './bridge'
import type { ProxyStreamEvent } from '../core/types/platform'

/**
 * 唯一的渲染进程 ↔ 主进程边界。
 * 只暴露白名单方法，不暴露 ipcRenderer / node API，渲染进程无法读取任意文件或执行命令。
 */
const api: ElectronBridgeApi = {
  kind: 'electron',
  info: {
    platform: process.platform,
    version: process.versions.electron
  },
  saveFile: (options) => ipcRenderer.invoke(IPC.saveFile, options),
  openFile: (options) => ipcRenderer.invoke(IPC.openFile, options),
  notify: (options) => ipcRenderer.invoke(IPC.notify, options),
  openExternal: (url) => ipcRenderer.invoke(IPC.openExternal, url),
  secure: {
    isAvailable: () => ipcRenderer.invoke(IPC.secureAvailable),
    encrypt: (plain) => ipcRenderer.invoke(IPC.secureEncrypt, plain),
    decrypt: (cipher) => ipcRenderer.invoke(IPC.secureDecrypt, cipher)
  },
  proxy: {
    start: (payload) => ipcRenderer.invoke(IPC.proxyStart, payload),
    abort: (requestId) => ipcRenderer.send(IPC.proxyAbort, requestId),
    onEvent: (callback) => {
      const listener = (_event: unknown, payload: ProxyStreamEvent): void => callback(payload)
      ipcRenderer.on(IPC.proxyEvent, listener)
      return () => {
        ipcRenderer.off(IPC.proxyEvent, listener)
      }
    }
  }
}

contextBridge.exposeInMainWorld('studypal', api)
