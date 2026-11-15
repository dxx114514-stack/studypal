import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { FeatureKey, ProviderConfig } from '@core/types/provider'
import { PROVIDER_PRESETS, createProviderFromPreset } from '@core/ai/providerRegistry'
import type { StoredProvider } from '@storage/schema'
import { repos } from '@storage/index'
import { saveProviderApiKey } from '../services/secretStore'

export const useProvidersStore = defineStore('providers', () => {
  const items = ref<StoredProvider[]>([])
  const loading = ref(false)

  async function refresh(): Promise<void> {
    loading.value = true
    try {
      items.value = await repos.providers.list()
    } finally {
      loading.value = false
    }
  }

  function newFromPreset(presetId: string): ProviderConfig | null {
    const preset = PROVIDER_PRESETS.find((item) => item.id === presetId)
    return preset ? createProviderFromPreset(preset) : null
  }

  async function save(config: ProviderConfig, apiKey?: string): Promise<void> {
    const existing = items.value.find((item) => item.id === config.id)
    const row: StoredProvider = {
      ...config,
      updatedAt: Date.now(),
      keyStorage: existing?.keyStorage ?? 'none',
      apiKeyCipher: existing?.apiKeyCipher,
      apiKeyPlain: existing?.apiKeyPlain
    }
    await repos.providers.save(row)
    if (apiKey !== undefined) {
      await saveProviderApiKey(config.id, apiKey)
    }
    await refresh()

    const settings = await repos.settings.load()
    if (!settings.defaultProviderId) {
      await repos.settings.save({ defaultProviderId: config.id })
    }
  }

  async function remove(id: string): Promise<void> {
    await repos.providers.remove(id)
    const settings = await repos.settings.load()
    const featureProviders: Partial<Record<FeatureKey, string>> = { ...settings.featureProviders }
    ;(Object.keys(featureProviders) as FeatureKey[]).forEach((key) => {
      if (featureProviders[key] === id) delete featureProviders[key]
    })
    await repos.settings.save({
      defaultProviderId: settings.defaultProviderId === id ? null : settings.defaultProviderId,
      featureProviders
    })
    await refresh()
  }

  function hasKey(id: string): boolean {
    const provider = items.value.find((item) => item.id === id)
    return provider?.keyStorage === 'safe-storage' || provider?.keyStorage === 'plain'
  }

  return { items, loading, refresh, newFromPreset, save, remove, hasKey }
})
