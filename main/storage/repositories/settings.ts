import { DEFAULT_SETTINGS, type AppSettings } from '../../core/types/settings'
import type { StorageDriver } from '../driver'
import { SETTINGS_KEY_APP } from '../schema'

export class SettingsRepository {
  constructor(private readonly driver: StorageDriver) {}

  async load(): Promise<AppSettings> {
    const row = await this.driver.get('settings', SETTINGS_KEY_APP)
    const stored = (row?.value ?? {}) as Partial<AppSettings>
    return {
      ...DEFAULT_SETTINGS,
      ...stored,
      featureProviders: { ...DEFAULT_SETTINGS.featureProviders, ...(stored.featureProviders ?? {}) },
      reviewIntervals: Array.isArray(stored.reviewIntervals)
        ? stored.reviewIntervals
        : DEFAULT_SETTINGS.reviewIntervals
    }
  }

  async save(patch: Partial<AppSettings>): Promise<AppSettings> {
    const current = await this.load()
    const next: AppSettings = { ...current, ...patch }
    await this.driver.put('settings', {
      key: SETTINGS_KEY_APP,
      value: next,
      updatedAt: Date.now()
    })
    return next
  }
}
