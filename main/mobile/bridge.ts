import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
import { Capacitor } from '@capacitor/core'
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import { LocalNotifications } from '@capacitor/local-notifications'
import { Share } from '@capacitor/share'
import type { ImageInput } from '../core/types/chat'
import type { OpenedFile, PlatformBridge, SaveFileOptions } from '../core/types/platform'

const UNSAFE_FILENAME = /[\\/:*?"<>|]/g
const TEXT_EXTENSIONS = new Set(['md', 'markdown', 'txt', 'json', 'svg', 'csv', 'log', 'html', 'xml', 'yaml', 'yml'])

let notificationId = 1

function pickFileFromWebView(extensions?: string[]): Promise<OpenedFile | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    if (extensions?.length) {
      input.accept = extensions.map((ext) => `.${ext.replace(/^\./, '')}`).join(',')
    }
    input.style.display = 'none'
    document.body.appendChild(input)
    input.addEventListener('change', async () => {
      const file = input.files?.[0] ?? null
      input.remove()
      if (!file) {
        resolve(null)
        return
      }
      const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
      if (TEXT_EXTENSIONS.has(extension)) {
        resolve({ name: file.name, text: await file.text() })
        return
      }
      resolve({ name: file.name, dataBase64: await fileToBase64(file) })
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

/**
 * iOS / Android 原生桥接：与桌面端共享同一套 UI 与 core 层。
 * 仅此处直接调用 Capacitor 插件，上层通过 PlatformBridge 接口访问。
 */
export function createCapacitorBridge(): PlatformBridge {
  return {
    kind: 'capacitor',
    info: {
      platform: Capacitor.getPlatform()
    },

    async saveFile(options: SaveFileOptions) {
      const fileName = options.defaultName.replace(UNSAFE_FILENAME, '_')
      const written = await Filesystem.writeFile({
        path: `StudyPal/${fileName}`,
        data: options.dataBase64 ?? options.text ?? '',
        directory: Directory.Documents,
        encoding: options.dataBase64 ? undefined : Encoding.UTF8,
        recursive: true
      })

      try {
        await Share.share({
          title: options.defaultName,
          url: written.uri
        })
      } catch {
        // 用户取消分享面板时不算失败，文件已写入 Documents/StudyPal
      }

      return { saved: true, path: written.uri }
    },

    /** 移动端用 WebView 文件选择器兜底（相机 / 相册仍走原生 Camera 插件） */
    async openFile(options): Promise<OpenedFile | null> {
      return pickFileFromWebView(options?.extensions)
    },

    async pickImage(options): Promise<ImageInput | null> {
      const photo = await Camera.getPhoto({
        quality: 82,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: options?.source === 'camera' ? CameraSource.Camera : CameraSource.Photos
      })
      if (!photo.base64String) return null
      return {
        mimeType: `image/${photo.format === 'jpg' ? 'jpeg' : photo.format}`,
        dataBase64: photo.base64String
      }
    },

    async notify(options) {
      const permission = await LocalNotifications.requestPermissions()
      if (permission.display !== 'granted') return
      await LocalNotifications.schedule({
        notifications: [
          {
            id: notificationId++,
            title: options.title,
            body: options.body,
            smallIcon: undefined
          }
        ]
      })
    },

    async openExternal(url) {
      if (/^https?:\/\//i.test(url)) {
        window.open(url, '_system')
      }
    },

    secure: {
      async isAvailable() {
        return false
      },
      async encrypt() {
        throw new Error('移动端暂未启用系统安全存储')
      },
      async decrypt() {
        throw new Error('移动端暂未启用系统安全存储')
      }
    }
  }
}
