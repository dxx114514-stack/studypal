import { ipcMain, safeStorage } from 'electron'
import { IPC } from '../bridge'

/**
 * API Key 安全存储：Windows DPAPI / macOS Keychain / Linux libsecret。
 * 密钥只在本机加密保存，不做任何形式的上传或云同步。
 */
export function registerSecureIpc(): void {
  ipcMain.handle(IPC.secureAvailable, () => {
    try {
      return safeStorage.isEncryptionAvailable()
    } catch {
      return false
    }
  })

  ipcMain.handle(IPC.secureEncrypt, (_event, plain: string) => {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('系统安全存储不可用')
    }
    return safeStorage.encryptString(plain).toString('base64')
  })

  ipcMain.handle(IPC.secureDecrypt, (_event, cipher: string) => {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('系统安全存储不可用')
    }
    return safeStorage.decryptString(Buffer.from(cipher, 'base64'))
  })
}
