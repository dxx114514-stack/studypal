<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ImageInput } from '@core/types/chat'
import { buildQaPrompt, type QaMode } from '@core/prompts/qa'
import { createCardFromDraft } from '@core/cards/factory'
import { repos } from '@storage/index'
import { runFeature } from '../services/aiRuntime'
import { useAiTask } from '../composables/useAiTask'
import { useSettingsStore } from '../stores/settings'
import ImagePicker from '../components/ImagePicker.vue'
import MarkdownView from '../components/MarkdownView.vue'

const settingsStore = useSettingsStore()
const mode = ref<QaMode>('hint')
const question = ref('')
const image = ref<ImageInput | null>(null)
const savedTip = ref('')
const saved = ref(false)
const copied = ref(false)

const { output, running, error, run, abort } = useAiTask()

const canSubmit = computed(() => Boolean(question.value.trim() || image.value))
const submitLabel = computed(() => (mode.value === 'hint' ? '给我思路提示' : '直接给出解析'))

async function ask(): Promise<void> {
  if (!canSubmit.value || running.value) return
  savedTip.value = ''
  saved.value = false
  const prompt = buildQaPrompt({
    mode: mode.value,
    stage: settingsStore.settings.stage,
    subject: settingsStore.settings.subject,
    question: question.value.trim() || '请识别图片中的题目，并按要求讲解。',
    hasImage: Boolean(image.value)
  })

  await run(async ({ signal, onDelta }) => {
    await runFeature('qa', {
      systemPrompt: prompt.system,
      messages: [{ role: 'user', content: prompt.user }],
      imageBytes: image.value ? [image.value] : undefined,
      signal,
      onDelta
    })
  })
}

async function copyOutput(): Promise<void> {
  if (!output.value) return
  await navigator.clipboard.writeText(output.value)
  copied.value = true
  window.setTimeout(() => {
    copied.value = false
  }, 1500)
}

async function saveToMistakes(): Promise<void> {
  if (!output.value.trim() || saved.value) return
  const card = createCardFromDraft(
    {
      type: 'question',
      front: question.value.trim() || '（图片题目，见解析）',
      back: output.value,
      tags: [settingsStore.settings.subject, '答疑']
    },
    { subject: settingsStore.settings.subject, source: 'qa', intervals: settingsStore.settings.reviewIntervals }
  )
  await repos.cards.save(card)
  saved.value = true
  savedTip.value = '已存入错题本，可在「错题」页按遗忘曲线复习'
}
</script>

<template>
  <div class="layout">
    <section class="card panel">
      <div class="section-title">
        <h2>题目输入</h2>
        <span class="badge">{{ mode === 'hint' ? '启发式' : '解题专家' }}</span>
      </div>

      <div class="mode-switch">
        <button
          class="mode"
          :class="{ active: mode === 'hint' }"
          type="button"
          @click="mode = 'hint'"
        >
          <strong>思路提示模式</strong>
          <span>苏格拉底式引导，不直接给答案</span>
        </button>
        <button
          class="mode"
          :class="{ active: mode === 'answer' }"
          type="button"
          @click="mode = 'answer'"
        >
          <strong>直接答疑模式</strong>
          <span>先答案，再分步解析与变式题</span>
        </button>
      </div>

      <ImagePicker v-model="image" />

      <div class="field">
        <label for="question">题目文字（可只拍照）</label>
        <textarea
          id="question"
          v-model="question"
          rows="5"
          placeholder="粘贴题干，或直接拍照 / 上传题目截图。"
        />
      </div>

      <div class="row actions">
        <button class="btn primary" type="button" :disabled="!canSubmit || running" @click="ask">
          <span v-if="running" class="spinner" />
          {{ running ? '正在讲解…' : submitLabel }}
        </button>
        <button v-if="running" class="btn" type="button" @click="abort">停止</button>
      </div>

      <p class="hint">当前：{{ settingsStore.settings.stage }} / {{ settingsStore.settings.subject }}</p>
    </section>

    <section class="card panel result">
      <div class="section-title">
        <h2>讲解结果</h2>
        <span v-if="output" class="hint">{{ output.length }} 字</span>
      </div>

      <p v-if="error" class="error-box">
        <strong>{{ error.title }}</strong><br />
        {{ error.message }}<br />
        <span class="hint">{{ error.hint }}</span>
      </p>

      <div v-if="output" class="output">
        <MarkdownView :text="output" />
      </div>
      <div v-else-if="!running" class="empty">
        输入题目后点击「{{ submitLabel }}」。<br />
        思路提示模式不会直接给答案，适合自己想通；直接答疑模式适合对答案与看步骤。
      </div>

      <div v-if="output" class="row result-actions">
        <button class="btn" type="button" :disabled="saved" @click="saveToMistakes">
          {{ saved ? '已存入错题本' : '存入错题本' }}
        </button>
        <button class="btn" type="button" @click="copyOutput">{{ copied ? '已复制' : '复制解析' }}</button>
        <span v-if="savedTip" class="hint">{{ savedTip }}</span>
      </div>
    </section>
  </div>
</template>

<style scoped>
.layout {
  display: grid;
  grid-template-columns: minmax(0, 420px) minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.mode-switch {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.mode {
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface-2);
  color: var(--text);
  font-family: inherit;
  cursor: pointer;
}

.mode span {
  font-size: 12px;
  color: var(--muted);
}

.mode.active {
  border-color: var(--brand);
  background: var(--brand-weak);
}

.actions {
  gap: 8px;
}

.output {
  max-height: 60vh;
  overflow-y: auto;
  padding-right: 4px;
}

.result-actions {
  border-top: 1px dashed var(--border);
  padding-top: 12px;
}

@media (max-width: 1080px) {
  .layout {
    grid-template-columns: 1fr;
  }

  .output {
    max-height: none;
  }
}
</style>
