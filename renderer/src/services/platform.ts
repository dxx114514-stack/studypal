import type { ImageInput } from '@core/types/chat'
import type { OpenedFile, PlatformBridge, SaveFileOptions } from '@core/types/platform'
import type { ElectronBridgeApi } from '@electron/bridge'

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp']
const TEXT_EXTENSIONS = ['md', 'markdown', 'txt', 'json', 'svg', 'csv', 'log', 'html', 'xml', 'yaml', 'yml']

let cached: Promise<PlatformBridge> | null = null

/** 统一获取当前运行环境桥接（Electron / Capacitor / 浏览器） */
export function getPlatform(): Promise<PlatformBridge> {
  if (!cached) cached = detectPlatform()
  return cached
}

async function detectPlatform(): Promise<PlatformBridge> {
  const electronApi = window.studypal
  if (electronApi?.kind === 'electron') {
    return createElectronPlatform(electronApi)
  }

  if (window.Capacitor?.isNativePlatform?.()) {
    const { createCapacitorBridge } = await import('@mobile/bridge')
    return createCapacitorBridge()
  }

  return createWebPlatform()
}

export function isElectron(): boolean {
  return window.studypal?.kind === 'electron'
}

function createElectronPlatform(api: ElectronBridgeApi): PlatformBridge {
  return {
    kind: 'electron',
    info: api.info,
    saveFile: (options) => api.saveFile(options),
    openFile: (options) => api.openFile(options),
    notify: (options) => api.notify(options),
    openExternal: (url) => api.openExternal(url),
    secure: api.secure,
    proxy: api.proxy,
    async pickImage(options) {
      const file = await api.openFile({
        extensions: options?.source === 'camera' ? undefined : IMAGE_EXTENSIONS
      })
      if (!file?.dataBase64) return null
      return { mimeType: mimeFromName(file.name), dataBase64: file.dataBase64 }
    }
  }
}

function createWebPlatform(): PlatformBridge {
  return {
    kind: 'web',
    info: { platform: 'web' },

    async saveFile(options: SaveFileOptions) {
      const blob = options.dataBase64
        ? base64ToBlob(options.dataBase64, options.mimeType)
        : new Blob([options.text ?? ''], { type: options.mimeType ?? 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = options.defaultName
      anchor.click()
      setTimeout(() => URL.revokeObjectURL(url), 1500)
      return { saved: true }
    },

    async openFile(options): Promise<OpenedFile | null> {
      const file = await pickFile(options?.extensions?.map((ext) => `.${ext.replace(/^\./, '')}`).join(','))
      if (!file) return null
      const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
      if (TEXT_EXTENSIONS.includes(extension)) {
        return { name: file.name, text: await file.text() }
      }
      return { name: file.name, dataBase64: await fileToBase64(file) }
    },

    async pickImage(options): Promise<ImageInput | null> {
      const file = await pickFile('image/*', options?.source === 'camera')
      if (!file) return null
      return { mimeType: file.type || mimeFromName(file.name), dataBase64: await fileToBase64(file) }
    },

    async notify(options) {
      if (!('Notification' in window)) return
      const permission =
        Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission
      if (permission === 'granted') new Notification(options.title, { body: options.body })
    },

    async openExternal(url) {
      window.open(url, '_blank', 'noopener,noreferrer')
    },

    secure: {
      async isAvailable() {
        return false
      },
      async encrypt() {
        throw new Error('当前环境不支持系统安全存储')
      },
      async decrypt() {
        throw new Error('当前环境不支持系统安全存储')
      }
    }
  }
}

function pickFile(accept?: string, capture = false): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    if (accept) input.accept = accept
    if (capture) input.setAttribute('capture', 'environment')
    input.style.display = 'none'
    document.body.appendChild(input)
    input.addEventListener('change', () => {
      resolve(input.files?.[0] ?? null)
      input.remove()
    })
    input.click()
  })
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result ?? '')
      resolve(result.slice(result.indexOf(',') + 1))
    }
    reader.onerror = () => reject(reader.error ?? new Error('读取文件失败'))
    reader.readAsDataURL(file)
  })
}

function base64ToBlob(dataBase64: string, mimeType = 'application/octet-stream'): Blob {
  const binary = atob(dataBase64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mimeType })
}

function mimeFromName(name: string): string {
  const extension = name.split('.').pop()?.toLowerCase() ?? ''
  if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg'
  if (extension === 'svg') return 'image/svg+xml'
  return `image/${extension || 'png'}`
}
