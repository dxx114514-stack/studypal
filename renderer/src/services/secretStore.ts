import { repos } from '@storage/index'
import { getPlatform } from './platform'

/**
 * API Key 本地保存策略：
 * 1. 优先使用 Electron 系统安全存储（DPAPI / Keychain / libsecret）加密后存 IndexedDB
 * 2. 无安全存储时退化为本机明文（仅存本地，绝不上传）
 */
export async function saveProviderApiKey(providerId: string, apiKey: string): Promise<void> {
  const trimmed = apiKey.trim()
  if (!trimmed) {
    await repos.providers.setKey(providerId, {})
    return
  }

  const platform = await getPlatform()
  try {
    if (await platform.secure.isAvailable()) {
      const cipher = await platform.secure.encrypt(trimmed)
      await repos.providers.setKey(providerId, { cipher })
      return
    }
  } catch (error) {
    console.warn('[StudyPal] 系统安全存储不可用，降级为本地明文保存', error)
  }

  await repos.providers.setKey(providerId, { plain: trimmed })
}

export async function readProviderApiKey(providerId: string): Promise<string> {
  const secret = await repos.providers.getSecret(providerId)
  if (!secret) return ''

  if (secret.cipher) {
    const platform = await getPlatform()
    try {
      return await platform.secure.decrypt(secret.cipher)
    } catch {
      return ''
    }
  }
  return secret.plain ?? ''
}
