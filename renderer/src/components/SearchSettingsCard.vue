<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { SearchProvider } from '@core/search/types'
import { searchKeySlot } from '@core/types/settings'
import { useSettingsStore } from '../stores/settings'
import { searchProviderLabel, saveSearchKey } from '../services/searchRuntime'

const settingsStore = useSettingsStore()

const provider = ref<SearchProvider>('tavily')
const maxResults = ref(5)
const apiKey = ref('')
const message = ref('')
const saving = ref(false)

const keyStates = computed(() => {
  const search = settingsStore.settings.search
  const has = (target: SearchProvider): boolean => {
    const slot = searchKeySlot(search, target)
    return Boolean(slot?.keyCipher || slot?.keyPlain)
  }
  return { tavily: has('tavily'), serper: has('serper') }
})

const hasKey = computed(() => keyStates.value[provider.value])
const providerName = computed(() => searchProviderLabel(provider.value))

watch(
  () => settingsStore.settings.search,
  (search) => {
    provider.value = search.provider
    maxResults.value = search.maxResults
  },
  { immediate: true, deep: true }
)

watch(provider, () => {
  apiKey.value = ''
  message.value = ''
})

async function save(): Promise<void> {
  if (saving.value) return
  const trimmedKey = apiKey.value.trim()
  const count = Math.min(10, Math.max(1, Math.round(Number(maxResults.value) || 5)))

  saving.value = true
  message.value = ''
  try {
    await settingsStore.update({
      search: { ...settingsStore.settings.search, provider: provider.value, maxResults: count }
    })
    if (trimmedKey) {
      await saveSearchKey(provider.value, trimmedKey)
      await settingsStore.load()
      apiKey.value = ''
    }
    message.value = hasKey.value
      ? `${providerName.value} 的 Key 已保存`
      : '设置已保存，填写 API Key 后即可在对话页使用'
  } catch (error) {
    message.value = error instanceof Error ? `保存失败：${error.message}` : '保存失败'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <section class="card">
    <div class="section-title">
      <h2>联网搜索</h2>
      <span v-if="hasKey" class="badge ok">已配置 {{ providerName }} Key</span>
      <span v-else class="badge danger">缺少 {{ providerName }} Key</span>
    </div>

    <p class="hint">在对话页开启「联网」后，提问会先搜索并把结果交给模型参考。Key 只保存在本机。</p>

    <div class="grid">
      <div class="field">
        <label for="search-provider">服务商</label>
        <select id="search-provider" v-model="provider">
          <option value="tavily">Tavily</option>
          <option value="serper">Serper</option>
        </select>
      </div>

      <div class="field">
        <label for="search-max">结果条数（1-10）</label>
        <input id="search-max" v-model.number="maxResults" type="number" min="1" max="10" />
      </div>

      <div class="field span-2">
        <label for="search-key">{{ providerName }} API Key</label>
        <input
          id="search-key"
          v-model="apiKey"
          type="password"
          autocomplete="off"
          :placeholder="hasKey ? '留空表示不修改已保存的 Key' : `填写 ${providerName} 的 API Key`"
        />
      </div>
    </div>

    <p class="hint key-state">
      Tavily：{{ keyStates.tavily ? '已配置' : '未配置' }} · Serper：{{ keyStates.serper ? '已配置' : '未配置' }}
      （两家 Key 分别保存，切换服务商不会互相覆盖）
    </p>

    <div class="row save-row">
      <button class="btn primary" type="button" :disabled="saving" @click="save">
        <span v-if="saving" class="spinner" />
        {{ saving ? '保存中…' : '保存' }}
      </button>
      <span v-if="message" class="hint">{{ message }}</span>
    </div>
  </section>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 12px;
}

.span-2 {
  grid-column: span 2;
}

.key-state {
  margin-top: 10px;
}

.save-row {
  margin-top: 14px;
}

@media (max-width: 640px) {
  .grid {
    grid-template-columns: 1fr;
  }

  .span-2 {
    grid-column: span 1;
  }
}
</style>
