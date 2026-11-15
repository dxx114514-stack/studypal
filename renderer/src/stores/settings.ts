import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { DEFAULT_SETTINGS, type AppSettings } from '@core/types/settings'
import { repos } from '@storage/index'

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<AppSettings>({ ...DEFAULT_SETTINGS })
  const loaded = ref(false)
  let mediaQuery: MediaQueryList | null = null

  function applyTheme(): void {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const resolved =
      settings.value.theme === 'system' ? (prefersDark ? 'dark' : 'light') : settings.value.theme
    document.documentElement.dataset.theme = resolved
  }

  async function load(): Promise<void> {
    settings.value = await repos.settings.load()
    loaded.value = true
    applyTheme()

    if (!mediaQuery) {
      mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      mediaQuery.addEventListener('change', () => {
        if (settings.value.theme === 'system') applyTheme()
      })
    }
  }

  async function update(patch: Partial<AppSettings>): Promise<void> {
    settings.value = await repos.settings.save(patch)
    applyTheme()
  }

  const stage = computed(() => settings.value.stage)
  const subject = computed(() => settings.value.subject)

  return { settings, loaded, stage, subject, load, update, applyTheme }
})
