<script setup lang="ts">
import { computed, ref } from 'vue'
import { buildWritingPrompt, type WritingLanguage } from '@core/prompts/writing'
import { stripThinking } from '@core/utils/thinking'
import { runFeature } from '../services/aiRuntime'
import { useAiTask } from '../composables/useAiTask'
import { useSettingsStore } from '../stores/settings'
import MarkdownView from '../components/MarkdownView.vue'

const settingsStore = useSettingsStore()
const language = ref<WritingLanguage>('en')
const topic = ref('')
const rubric = ref('')
const essay = ref('')
const showRubric = ref(false)
const copied = ref(false)

const { output, running, error, run, abort } = useAiTask()

const wordCount = computed(() => {
  const text = essay.value.trim()
  if (!text) return 0
  if (language.value === 'zh') return text.replace(/\s/g, '').length
  return text.split(/\s+/).filter(Boolean).length
})

const canSubmit = computed(() => essay.value.trim().length > 0)

async function copyOutput(): Promise<void> {
  if (!output.value) return
  await navigator.clipboard.writeText(stripThinking(output.value) || output.value)
  copied.value = true
  window.setTimeout(() => {
    copied.value = false
  }, 1500)
}

async function submit(): Promise<void> {
  if (!canSubmit.value || running.value) return
  const prompt = buildWritingPrompt({
    language: language.value,
    stage: settingsStore.settings.stage,
    subject: settingsStore.settings.subject,
    topic: topic.value,
    essay: essay.value,
    rubric: rubric.value
  })

  await run(async ({ signal, onDelta }) => {
    await runFeature('writing', {
      systemPrompt: prompt.system,
      messages: [{ role: 'user', content: prompt.user }],
      signal,
      onDelta
    })
  })
}
</script>

<template>
  <div class="layout">
    <section class="card panel">
      <div class="section-title">
        <h2>作文输入</h2>
        <span class="hint">{{ wordCount }} {{ language === 'zh' ? '字' : 'words' }}</span>
      </div>

      <div class="row">
        <button
          class="btn sm"
          :class="{ primary: language === 'en' }"
          type="button"
          @click="language = 'en'"
        >
          English
        </button>
        <button
          class="btn sm"
          :class="{ primary: language === 'zh' }"
          type="button"
          @click="language = 'zh'"
        >
          中文
        </button>
      </div>

      <div class="field">
        <label for="topic">题目 / 要求</label>
        <input id="topic" v-model="topic" type="text" placeholder="例如：Write about a memorable trip. / 以“成长”为题写一篇记叙文" />
      </div>

      <div class="field">
        <label for="essay">正文</label>
        <textarea id="essay" v-model="essay" rows="14" placeholder="粘贴你的作文，批改会给出总分、分类问题与润色范文。" />
      </div>

      <button class="btn sm ghost rubric-toggle" type="button" @click="showRubric = !showRubric">
        {{ showRubric ? '收起评分标准' : '自定义评分标准（可选）' }}
      </button>
      <textarea v-if="showRubric" v-model="rubric" rows="3" placeholder="例如：内容 40 分、语言 40 分、结构 20 分" />

      <div class="row">
        <button class="btn primary" type="button" :disabled="!canSubmit || running" @click="submit">
          <span v-if="running" class="spinner" />
          {{ running ? '批改中…' : '开始批改' }}
        </button>
        <button v-if="running" class="btn" type="button" @click="abort">停止</button>
      </div>

      <p class="hint">英语会标注 CEFR 等级；中文会分析立意、结构、修辞与论证逻辑。</p>
    </section>

    <section class="card panel">
      <div class="section-title">
        <h2>批改报告</h2>
        <span v-if="output" class="hint">{{ output.length }} 字</span>
      </div>

      <p v-if="error" class="error-box">
        <strong>{{ error.title }}</strong><br />
        {{ error.message }}<br />
        <span class="hint">{{ error.hint }}</span>
      </p>

      <div v-if="output" class="output"><MarkdownView :text="output" /></div>
      <div v-if="output" class="row">
        <button class="btn sm" type="button" @click="copyOutput">
          {{ copied ? '已复制' : '复制批改报告' }}
        </button>
      </div>
      <div v-else-if="!running" class="empty">批改结果会逐字出现在这里。</div>
    </section>
  </div>
</template>

<style scoped>
.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.rubric-toggle {
  align-self: flex-start;
}

.output {
  max-height: 66vh;
  overflow-y: auto;
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
