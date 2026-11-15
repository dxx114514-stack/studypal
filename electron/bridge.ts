import type {
  OpenedFile,
  ProxyApi,
  SaveFileOptions,
  SecureStoreApi
} from '../core/types/platform'

/**
 * 主进程 ↔ 渲染进程的 IPC 契约。
 * 该文件不引入 electron 运行时，渲染进程可安全地只导入类型与通道常量。
 */
export const IPC = {
  saveFile: 'studypal:file:save',
  openFile: 'studypal:file:open',
  notify: 'studypal:notify',
  openExternal: 'studypal:external:open',
  secureAvailable: 'studypal:secure:available',
  secureEncrypt: 'studypal:secure:encrypt',
  secureDecrypt: 'studypal:secure:decrypt',
  proxyStart: 'studypal:proxy:start',
  proxyAbort: 'studypal:proxy:abort',
  proxyEvent: 'studypal:proxy:event'
} as const

export type IpcChannel = (typeof IPC)[keyof typeof IPC]

/** preload 通过 contextBridge 暴露到 window.studypal 的完整 API */
export interface ElectronBridgeApi {
  readonly kind: 'electron'
  info: { platform: string; version?: string }
  saveFile(options: SaveFileOptions): Promise<{ saved: boolean; path?: string }>
  openFile(options?: { extensions?: string[] }): Promise<OpenedFile | null>
  notify(options: { title: string; body: string }): Promise<void>
  openExternal(url: string): Promise<void>
  secure: SecureStoreApi
  proxy: ProxyApi
}
