import type { StoredProvider } from '../schema'
import type { StorageDriver } from '../driver'

export interface ProviderKeyPayload {
  cipher?: string
  plain?: string
}

export class ProviderRepository {
  constructor(private readonly driver: StorageDriver) {}

  async list(): Promise<StoredProvider[]> {
    const rows = await this.driver.all('providers')
    return rows.sort((a, b) => a.createdAt - b.createdAt)
  }

  async get(id: string): Promise<StoredProvider | undefined> {
    return this.driver.get('providers', id)
  }

  async save(provider: StoredProvider): Promise<void> {
    await this.driver.put('providers', provider)
  }

  async remove(id: string): Promise<void> {
    await this.driver.remove('providers', id)
  }

  /** 只更新密钥字段，避免每次保存都把密文重新读写一遍 */
  async setKey(id: string, payload: ProviderKeyPayload): Promise<void> {
    const provider = await this.get(id)
    if (!provider) return
    const next: StoredProvider = {
      ...provider,
      apiKeyCipher: payload.cipher,
      apiKeyPlain: payload.plain,
      keyStorage: payload.cipher ? 'safe-storage' : payload.plain ? 'plain' : 'none',
      updatedAt: Date.now()
    }
    await this.driver.put('providers', next)
  }

  async getSecret(id: string): Promise<ProviderKeyPayload | null> {
    const provider = await this.get(id)
    if (!provider) return null
    if (!provider.apiKeyCipher && !provider.apiKeyPlain) return null
    return { cipher: provider.apiKeyCipher, plain: provider.apiKeyPlain }
  }

  async count(): Promise<number> {
    return (await this.driver.all('providers')).length
  }
}
