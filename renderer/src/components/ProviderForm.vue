<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import type { ProviderConfig, ProviderProtocol } from '@core/types/provider'
import { PROVIDER_PRESETS } from '@core/ai/providerRegistry'
import { toAIError } from '@core/ai/errors'
import { newId } from '@core/utils/id'
import { testProviderConnection } from '../services/aiRuntime'

const props = defineProps<{ provider: ProviderConfig | null }>()
const emit = defineEmits<{
  cancel: []
  submit: [payload: { config: ProviderConfig; apiKey: string }]
}>()

const form = reactive({
  name: props.provider?.name ?? '',
  protocol: (props.provider?.protocol ?? 'openai') as ProviderProtocol,
  baseUrl: props.provider?.baseUrl ?? '',
  modelType: props.provider?.modelType ?? '',
  supportsVision: props.provider?.supportsVision ?? false,
  supportsStream: props.provider?.supportsStream ?? true,
  useLocalProxy: props.provider?.useLocalProxy ?? false,
  notes: props.provider?.notes ?? ''
})

const apiKey = ref('')
const errorMessage = ref('')
const presetId = ref('')
const testing = ref(false)
const testMessage = ref('')
const testOk = ref(false)

const isEdit = computed(() => Boolean(props.provider))
const presets = PROVIDER_PRESETS

watch(
  () => props.provider,
  (provider) => {
    if (!provider) return
    form.name = provider.name
    form.protocol = provider.protocol
    form.baseUrl = provider.baseUrl
    form.modelType = provider.modelType
    form.supportsVision = provider.supportsVision
    form.supportsStream = provider.supportsStream
    form.useLocalProxy = provider.useLocalProxy
    form.notes = provider.notes ?? ''
  }
)

function applyPreset(): void {
  const preset = PROVIDER_PRESETS.find((item) => item.id === presetId.value)
  if (!preset) return
  form.name = preset.name
  form.protocol = preset.protocol
  form.baseUrl = preset.baseUrl
  form.modelType = preset.modelType
  form.supportsVision = preset.supportsVision
  form.supportsStream = preset.supportsStream
  form.notes = preset.notes
}

function buildConfig(): ProviderConfig | null {
  errorMessage.value = ''
  if (!form.name.trim()) {
    errorMessage.value = '请填写提供商名称'
    return null
  }
  if (!/^https?:\/\//i.test(form.baseUrl.trim())) {
    errorMessage.value = 'Base URL 需以 http:// 或 https:// 开头'
    return null
  }
  if (!form.modelType.trim()) {
    errorMessage.value = '请填写模型名称'
    return null
  }

  const now = Date.now()
  return {
    id: props.provider?.id ?? newId('provider'),
    name: form.name.trim(),
    protocol: form.protocol,
    baseUrl: form.baseUrl.trim().replace(/\/+$/, ''),
    modelType: form.modelType.trim(),
    supportsVision: form.supportsVision,
    supportsStream: form.supportsStream,
    useLocalProxy: form.useLocalProxy,
    notes: form.notes.trim() || undefined,
    createdAt: props.provider?.createdAt ?? now,
    updatedAt: now
  }
}

function submit(): void {
  const config = buildConfig()
  if (!config) return
  emit('submit', { config, apiKey: apiKey.value })
}

async function testConnection(): Promise<void> {
  if (testing.value) return
  const config = buildConfig()
  if (!config) return

  testing.value = true
  testMessage.value = ''
  testOk.value = false
  try {
    const result = await testProviderConnection(config, apiKey.value)
    testOk.value = true
    testMessage.value = `连接成功（${result.ms} ms）${result.sample ? `：${result.sample}` : ''}`
  } catch (error) {
    const aiError = toAIError(error)
    testOk.value = false
    testMessage.value =
      aiError.message && aiError.message !== aiError.title
        ? `${aiError.title}：${aiError.message}`
        : `${aiError.title}：${aiError.hint}`
  } finally {
    testing.value = false
  }
}
</script>

<template>
  <form class="card form" @submit.prevent="submit">
    <div class="section-title">
      <h2>{{ isEdit ? '编辑提供商' : '添加提供商' }}</h2>
      <button class="btn sm ghost" type="button" @click="emit('cancel')">取消</button>
    </div>

    <div v-if="!isEdit" class="field">
      <label for="preset">快速填充预设</label>
      <div class="row">
        <select id="preset" v-model="presetId" class="grow">
          <option value="">选择预设（可跳过）</option>
          <option v-for="preset in presets" :key="preset.id" :value="preset.id">
            {{ preset.name }}
          </option>
        </select>
        <button class="btn sm" type="button" :disabled="!presetId" @click="applyPreset">填充</button>
      </div>
    </div>

    <div class="grid">
      <div class="field">
        <label for="name">名称</label>
        <input id="name" v-model="form.name" type="text" placeholder="例如 我的 OpenAI" />
      </div>

      <div class="field">
        <label for="protocol">接口协议</label>
        <select id="protocol" v-model="form.protocol">
          <option value="openai">OpenAI 兼容</option>
          <option value="anthropic">Anthropic</option>
          <option value="gemini">Google Gemini</option>
        </select>
      </div>

      <div class="field span-2">
        <label for="baseUrl">Base URL</label>
        <input id="baseUrl" v-model="form.baseUrl" type="text" placeholder="https://api.openai.com/v1" />
      </div>

      <div class="field">
        <label for="model">模型名称</label>
        <input id="model" v-model="form.modelType" type="text" placeholder="gpt-4o-mini" />
      </div>

      <div class="field">
        <label for="apiKey">API Key</label>
        <input
          id="apiKey"
          v-model="apiKey"
          type="password"
          autocomplete="off"
          :placeholder="isEdit ? '留空表示不修改已保存的 Key' : 'sk-...'"
        />
        <span class="hint">仅保存在本机，不会上传到任何服务器。</span>
      </div>
    </div>

    <div class="toggles">
      <label class="check"><input v-model="form.supportsVision" type="checkbox" /> 支持图片输入</label>
      <label class="check"><input v-model="form.supportsStream" type="checkbox" /> 支持流式输出</label>
      <label class="check"><input v-model="form.useLocalProxy" type="checkbox" /> 使用本地代理</label>
    </div>

    <div class="field">
      <label for="notes">备注</label>
      <input id="notes" v-model="form.notes" type="text" placeholder="例如：用于写作批改 / 本地 Ollama" />
    </div>

    <p v-if="errorMessage" class="error-box">{{ errorMessage }}</p>
    <p v-if="testMessage" class="test-result" :class="testOk ? 'ok' : 'fail'">{{ testMessage }}</p>

    <div class="row">
      <button class="btn primary" type="submit">{{ isEdit ? '保存修改' : '添加提供商' }}</button>
      <button class="btn" type="button" :disabled="testing" @click="testConnection">
        <span v-if="testing" class="spinner" />
        {{ testing ? '测试中…' : '测试连接' }}
      </button>
      <span class="hint">测试会发送一次极短请求，可能产生少量 token 费用。</span>
    </div>
  </form>
</template>

<style scoped>
.form {
  display: flex;
  flex-direction: column;
  gap: 14px;
  box-shadow: none;
}

.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.span-2 {
  grid-column: span 2;
}

.toggles {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  font-size: 13.5px;
}

.check {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--muted);
}

.check input {
  width: auto;
}

.test-result {
  margin: 0;
  font-size: 13px;
  border-radius: 8px;
  padding: 8px 12px;
}

.test-result.ok {
  background: var(--ok-weak);
  color: var(--ok);
}

.test-result.fail {
  background: var(--danger-weak);
  color: var(--danger);
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
