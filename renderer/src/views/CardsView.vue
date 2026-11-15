<script setup lang="ts">
import { ref } from 'vue'
import { buildCardsPrompt, type CardDraftKind } from '@core/prompts/cards'
import { normalizeDrafts } from '@core/cards/factory'
import { extractJson } from '@core/utils/json'
import { repos } from '@storage/index'
import { runFeature } from '../services/aiRuntime'
import { useAiTask } from '../composables/useAiTask'
import { useSettingsStore } from '../stores/settings'
import CardBrowser from '../components/CardBrowser.vue'

const settingsStore = useSettingsStore()
const source = ref('')
const kind = ref<CardDraftKind>('mixed')
const count = ref(5)
const message = ref('')
const parseError = ref('')
const browser = ref<{ reload: () => Promise<void> } | null>(null)

const { running, error, run, abort } = useAiTask()

async function generate(): Promise<void> {
  if (!source.value.trim() || running.value) return
  message.value = ''
  parseError.value = ''

  const prompt = buildCardsPrompt({
    kind: kind.value,
    stage: settingsStore.settings.stage,
    subject: settingsStore.settings.subject,
    source: source.value,
    count: count.value
  })

  await run(async ({ signal, onDelta }) => {
    const full = await runFeature('cards', {
      systemPrompt: prompt.system,
      messages: [{ role: 'user', content: prompt.user }],
      signal,
      onDelta
    })

    try {
      const drafts = normalizeDrafts(extractJson<unknown>(full))
      if (drafts.length === 0) {
        parseError.value = '模型没有返回有效卡片，请调整材料或重试。'
        return
      }
      const created = await repos.cards.importDrafts(drafts, {
        subject: settingsStore.settings.subject,
        source: 'import',
        intervals: settingsStore.settings.reviewIntervals
      })
      message.value =
        created.length > 0
          ? `已生成并保存 ${created.length} 张卡片`
          : '卡片均已存在，未重复创建'
      await browser.value?.reload()
    } catch {
      parseError.value = '模型返回的 JSON 无法解析，可重试一次或更换模型。'
    }
  })
}
</script>

<template>
  <div class="stack">
    <section class="card generator">
      <div class="section-title">
        <h2>AI 生成复习卡片</h2>
        <span class="hint">间隔：{{ settingsStore.settings.reviewIntervals.join(' / ') }} 天</span>
      </div>

      <div class="row">
        <div class="field grow">
          <label for="card-kind">卡片类型</label>
          <select id="card-kind" v-model="kind">
            <option value="mixed">单词 + 错题混合</option>
            <option value="word">单词 / 概念卡</option>
            <option value="question">错题卡</option>
          </select>
        </div>
        <div class="field count-field">
          <label for="card-count">数量</label>
          <input id="card-count" v-model.number="count" type="number" min="1" max="20" />
        </div>
      </div>

      <div class="field">
        <label for="card-source">学习材料</label>
        <textarea
          id="card-source"
          v-model="source"
          rows="5"
          placeholder="粘贴课文、单词表、错题与解析，AI 会提炼成 front / back 结构。"
        />
      </div>

      <div class="row">
        <button class="btn primary" type="button" :disabled="!source.trim() || running" @click="generate">
          <span v-if="running" class="spinner" />
          {{ running ? '生成中…' : '生成并保存卡片' }}
        </button>
        <button v-if="running" class="btn" type="button" @click="abort">停止</button>
        <span v-if="message" class="badge ok">{{ message }}</span>
      </div>

      <p v-if="error" class="error-box">
        <strong>{{ error.title }}</strong><br />
        {{ error.message }}<br />
        <span class="hint">{{ error.hint }}</span>
      </p>
      <p v-if="parseError" class="error-box">{{ parseError }}</p>
    </section>

    <CardBrowser ref="browser" />
  </div>
</template>

<style scoped>
.generator {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.count-field {
  width: 110px;
}
</style>
