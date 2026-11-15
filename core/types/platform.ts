import type { ImageInput } from './chat'

/**
 * 桌面（Electron）/ 移动（Capacitor）/ 浏览器 三种运行环境的统一能力接口。
 * 核心层只依赖该接口，不直接触碰任何平台 API。
 */
export interface SaveFileOptions {
  defaultName: string
  mimeType?: string
  /** 文本内容（Markdown / JSON / SVG 等） */
  text?: string
  /** 二进制内容（PNG 等），优先于 text */
  dataBase64?: string
  filters?: { name: string; extensions: string[] }[]
}

export interface OpenedFile {
  name: string
  path?: string
  text?: string
  dataBase64?: string
}

export interface SecureStoreApi {
  /** 由主进程 / 原生层判断系统安全存储是否可用 */
  isAvailable(): Promise<boolean>
  encrypt(plain: string): Promise<string>
  decrypt(cipher: string): Promise<string>
}

export interface ProxyStreamPayload {
  requestId: string
  url: string
  headers: Record<string, string>
  body: string
}

export type ProxyStreamEvent =
  | { requestId: string; type: 'chunk'; data: string }
  | { requestId: string; type: 'done' }
  | { requestId: string; type: 'error'; message: string; status?: number }

/** Electron 专有的本地转发能力（可选，绝不强制） */
export interface ProxyApi {
  start(payload: ProxyStreamPayload): Promise<{ status: number; ok: boolean }>
  abort(requestId: string): void
  onEvent(callback: (event: ProxyStreamEvent) => void): () => void
}

export interface PlatformBridge {
  readonly kind: 'electron' | 'capacitor' | 'web'
  saveFile(options: SaveFileOptions): Promise<{ saved: boolean; path?: string }>
  openFile(options?: { extensions?: string[] }): Promise<OpenedFile | null>
  pickImage(options?: { source?: 'camera' | 'gallery' }): Promise<ImageInput | null>
  notify(options: { title: string; body: string }): Promise<void>
  openExternal(url: string): Promise<void>
  secure: SecureStoreApi
  /** 仅 Electron 环境存在 */
  proxy?: ProxyApi
  info: { platform: string; version?: string }
}
