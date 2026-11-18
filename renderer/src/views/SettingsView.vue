<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { FeatureKey, ProviderConfig } from '@core/types/provider'
import { FEATURE_KEYS, FEATURE_LABELS } from '@core/types/provider'
import { PROVIDER_PRESETS } from '@core/ai/providerRegistry'
import type { StudyStage } from '@core/types/curriculum'
import { STUDY_STAGES, SUBJECTS } from '@core/types/curriculum'
import type { ThemeMode } from '@core/types/settings'
import { TABLE_NAMES } from '@storage/schema'
import { exportAll, importAll } from '@storage/backup'
import { storageDriver } from '@storage/index'
import { useSettingsStore } from '../stores/settings'
import { useProvidersStore } from '../stores/providers'
import { getPlatform, isElectron } from '../services/platform'
import ProviderForm from '../components/ProviderForm.vue'
import SearchSettingsCard from '../components/SearchSettingsCard.vue'

const settingsStore = useSettingsStore()
const providersStore = useProvidersStore()

const showForm = ref(false)
const editingProvider = ref<ProviderConfig | null>(null)
const message = ref('')
const intervalsText = ref('')
const busy = ref(false)

const desktop = isElectron()
const platformKind = computed(() => {
  if (window.studypal) return 'Electron 桌面端'
  if (window.Capacitor?.isNativePlatform?.()) return '移动端（Capacitor）'
  return '浏览器 Web'
})

watch(
  () => settingsStore.settings.reviewIntervals,
  (value) => {
    intervalsText.value = value.join(', ')
  },
  { immediate: true, deep: true }
)

function openAdd(): void {
  editingProvider.value = null
  showForm.value = true
}

function openEdit(provider: ProviderConfig): void {
  editingProvider.value = provider
  showForm.value = true
}

async function submitProvider(payload: { config: ProviderConfig; apiKey: string }): Promise<void> {
  await providersStore.save(payload.config, payload.apiKey)
  await settingsStore.load()
  showForm.value = false
  editingProvider.value = null
  message.value = '提供商已保存'
}

async function quickAdd(presetId: string): Promise<void> {
  const config = providersStore.newFromPreset(presetId)
  if (!config) return
  await providersStore.save(config)
  await settingsStore.load()
  message.value = `已添加 ${config.name}，请编辑并填入 API Key`
  openEdit(config)
}

async function removeProvider(id: string): Promise<void> {
  if (!window.confirm('确定删除该提供商？已保存的 API Key 也会一并移除。')) return
  await providersStore.remove(id)
  await settingsStore.load()
  message.value = '提供商已删除'
}

async function onThemeChange(event: Event): Promise<void> {
  await settingsStore.update({ theme: (event.target as HTMLSelectElement).value as ThemeMode })
}

async function onStageChange(event: Event): Promise<void> {
  await settingsStore.update({ stage: (event.target as HTMLSelectElement).value as StudyStage })
}

async function onSubjectChange(event: Event): Promise<void> {
  await settingsStore.update({ subject: (event.target as HTMLSelectElement).value })
}

async function onDefaultProviderChange(event: Event): Promise<void> {
  const value = (event.target as HTMLSelectElement).value
  await settingsStore.update({ defaultProviderId: value || null })
}

async function onFeatureProviderChange(feature: FeatureKey, event: Event): Promise<void> {
  const value = (event.target as HTMLSelectElement).value
  const featureProviders = { ...settingsStore.settings.featureProviders }
  if (value) featureProviders[feature] = value
  else delete featureProviders[feature]
  await settingsStore.update({ featureProviders })
}

async function onProxyToggle(event: Event): Promise<void> {
  await settingsStore.update({ localProxyEnabled: (event.target as HTMLInputElement).checked })
}

async function saveIntervals(): Promise<void> {
  const parsed = intervalsText.value
    .split(/[,，\s]+/)
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isFinite(value) && value > 0)
  if (parsed.length === 0) {
    message.value = '复习间隔至少填写一个正整数'
    return
  }
  await settingsStore.update({ reviewIntervals: parsed.sort((a, b) => a - b) })
  message.value = '复习间隔已更新'
}

async function exportBackup(): Promise<void> {
  busy.value = true
  try {
    const platform = await getPlatform()
    const data = await exportAll(storageDriver)
    const date = new Date().toISOString().slice(0, 10)
    await platform.saveFile({
      defaultName: `studypal-backup-${date}.json`,
      text: JSON.stringify(data, null, 2),
      mimeType: 'application/json',
      filters: [{ name: 'JSON', extensions: ['json'] }]
    })
    message.value = '备份已导出（含卡片、导图、设置与提供商配置；API Key 密文也在其中，请妥善保管）'
  } finally {
    busy.value = false
  }
}

async function importBackup(): Promise<void> {
  busy.value = true
  try {
    const platform = await getPlatform()
    const file = await platform.openFile({ extensions: ['json'] })
    if (!file?.text) return
    const result = await importAll(storageDriver, JSON.parse(file.text))
    await settingsStore.load()
    await providersStore.refresh()
    message.value = `已导入 ${result.imported} 条记录`
  } catch (error) {
    message.value = error instanceof Error ? `导入失败：${error.message}` : '导入失败'
  } finally {
    busy.value = false
  }
}

async function clearAll(): Promise<void> {
  if (!window.confirm('将清空本机全部数据（卡片、导图、对话、提供商与设置），且无法恢复。继续？')) return
  for (const table of TABLE_NAMES) {
    await storageDriver.clear(table)
  }
  await settingsStore.load()
  await providersStore.refresh()
  message.value = '本地数据已清空'
}
</script>

<template>
  <div class="stack">
    <p v-if="message" class="badge ok">{{ message }}</p>

    <section class="card">
      <div class="section-title">
        <h2>学习偏好</h2>
        <span class="hint">影响 AI 讲解深度与用词</span>
      </div>

      <div class="grid">
        <div class="field">
          <label for="set-stage">学段</label>
          <select id="set-stage" :value="settingsStore.settings.stage" @change="onStageChange">
            <option v-for="stage in STUDY_STAGES" :key="stage.id" :value="stage.id">
              {{ stage.label }}
            </option>
          </select>
        </div>

        <div class="field">
          <label for="set-subject">默认学科</label>
          <select id="set-subject" :value="settingsStore.settings.subject" @change="onSubjectChange">
            <option v-for="subject in SUBJECTS" :key="subject.id" :value="subject.id">
              {{ subject.label }}
            </option>
          </select>
        </div>

        <div class="field">
          <label for="set-theme">主题</label>
          <select id="set-theme" :value="settingsStore.settings.theme" @change="onThemeChange">
            <option value="system">跟随系统</option>
            <option value="light">浅色</option>
            <option value="dark">深色</option>
          </select>
        </div>

        <div class="field">
          <label for="set-intervals">复习间隔（天）</label>
          <div class="row">
            <input id="set-intervals" v-model="intervalsText" type="text" placeholder="1, 3, 7, 14, 30" />
            <button class="btn sm" type="button" @click="saveIntervals">保存</button>
          </div>
        </div>
      </div>
    </section>

    <section class="card">
      <div class="section-title">
        <h2>AI 提供商</h2>
        <div class="row">
          <button class="btn sm" type="button" @click="openAdd">自定义添加</button>
        </div>
      </div>

      <div class="row quick">
        <button
          v-for="preset in PROVIDER_PRESETS"
          :key="preset.id"
          class="btn sm ghost"
          type="button"
          @click="quickAdd(preset.id)"
        >
          + {{ preset.name }}
        </button>
      </div>

      <div v-if="providersStore.items.length === 0" class="empty">
        还没有提供商。点击上方预设或「自定义添加」开始，API Key 只会保存在本机。
      </div>

      <div v-for="provider in providersStore.items" :key="provider.id" class="provider-row">
        <div class="provider-info">
          <div class="row">
            <strong>{{ provider.name }}</strong>
            <span class="badge">{{ provider.protocol }}</span>
            <span v-if="providersStore.hasKey(provider.id)" class="badge ok">已配置 Key</span>
            <span v-else class="badge danger">缺少 Key</span>
          </div>
          <p class="hint">{{ provider.baseUrl }} · {{ provider.modelType }}</p>
          <p v-if="provider.notes" class="hint">{{ provider.notes }}</p>
        </div>
        <div class="row">
          <button class="btn sm" type="button" @click="openEdit(provider)">编辑</button>
          <button class="btn sm danger" type="button" @click="removeProvider(provider.id)">删除</button>
        </div>
      </div>

      <ProviderForm
        v-if="showForm"
        :provider="editingProvider"
        @cancel="showForm = false"
        @submit="submitProvider"
      />
    </section>

    <section class="card">
      <div class="section-title">
        <h2>功能模型路由</h2>
        <span class="hint">可为不同功能指定不同模型</span>
      </div>

      <div class="field">
        <label for="default-provider">全局默认提供商</label>
        <select
          id="default-provider"
          :value="settingsStore.settings.defaultProviderId ?? ''"
          @change="onDefaultProviderChange"
        >
          <option value="">未选择</option>
          <option v-for="provider in providersStore.items" :key="provider.id" :value="provider.id">
            {{ provider.name }} · {{ provider.modelType }}
          </option>
        </select>
      </div>

      <div class="routes">
        <div v-for="feature in FEATURE_KEYS" :key="feature" class="route-row">
          <span>{{ FEATURE_LABELS[feature] }}</span>
          <select
            :value="settingsStore.settings.featureProviders[feature] ?? ''"
            @change="onFeatureProviderChange(feature, $event)"
          >
            <option value="">跟随全局默认</option>
            <option v-for="provider in providersStore.items" :key="provider.id" :value="provider.id">
              {{ provider.name }} · {{ provider.modelType }}
            </option>
          </select>
        </div>
      </div>

      <p class="hint">建议：拍照答疑 / 导图用多模态模型，写作批改用长文本能力强的模型。</p>
    </section>

    <section class="card">
      <div class="section-title">
        <h2>本地代理</h2>
        <span class="hint">{{ desktop ? '桌面端可用' : '当前环境不可用' }}</span>
      </div>

      <label class="check">
        <input
          type="checkbox"
          :checked="settingsStore.settings.localProxyEnabled"
          :disabled="!desktop"
          @change="onProxyToggle"
        />
        允许通过 Electron 主进程转发 AI 请求
      </label>

      <p class="hint">
        默认关闭。仅当浏览器 CORS 或 localhost 调用失败时开启；主进程只做透明转发，不记录请求内容。
        单个提供商还需在编辑页勾选「使用本地代理」。
      </p>
    </section>

    <SearchSettingsCard />

    <section class="card">
      <div class="section-title">
        <h2>数据与隐私</h2>
        <span class="badge">本地优先</span>
      </div>

      <div class="row">
        <button class="btn" type="button" :disabled="busy" @click="exportBackup">导出备份</button>
        <button class="btn" type="button" :disabled="busy" @click="importBackup">导入备份</button>
        <button class="btn danger" type="button" :disabled="busy" @click="clearAll">清空本地数据</button>
      </div>

      <p class="hint">
        所有学习数据默认保存在本机 IndexedDB，不登录、不上传、不参与任何云端同步。
        备份文件可能包含加密后的 API Key 密文，请勿随意分享。
      </p>
    </section>

    <section class="card">
      <div class="section-title">
        <h2>关于</h2>
        <span class="hint">{{ platformKind }}</span>
      </div>
      <p class="hint">
        dxx's StudyPal 0.1.0 · MIT License · 永久免费、无广告、无强制登录。<br />
        覆盖数学、语文、英语、物理、化学、生物、历史、政治、地理与通用学科。
      </p>
    </section>
  </div>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.quick {
  gap: 6px;
  margin-bottom: 12px;
}

.provider-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 0;
  border-top: 1px solid var(--border);
}

.provider-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.provider-info p {
  margin: 0;
  word-break: break-all;
}

.routes {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
}

.route-row {
  display: grid;
  grid-template-columns: 140px 1fr;
  align-items: center;
  gap: 10px;
  font-size: 13.5px;
}

.check {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  margin-bottom: 6px;
}

.check input {
  width: auto;
}

@media (max-width: 720px) {
  .grid {
    grid-template-columns: 1fr;
  }

  .route-row {
    grid-template-columns: 1fr;
    gap: 4px;
  }

  .provider-row {
    flex-direction: column;
  }
}
</style>
