<script setup lang="ts">
import { ref } from 'vue'
import { createCardFromDraft } from '@core/cards/factory'
import { repos } from '@storage/index'
import { useSettingsStore } from '../stores/settings'
import CardBrowser from '../components/CardBrowser.vue'

const settingsStore = useSettingsStore()
const front = ref('')
const back = ref('')
const tags = ref('')
const message = ref('')
const browser = ref<{ reload: () => Promise<void> } | null>(null)

async function addMistake(): Promise<void> {
  if (!front.value.trim() || !back.value.trim()) {
    message.value = '请填写题目与解析'
    return
  }
  const card = createCardFromDraft(
    {
      type: 'question',
      front: front.value.trim(),
      back: back.value.trim(),
      tags: tags.value
        .split(/[,，\s]+/)
        .map((tag) => tag.trim())
        .filter(Boolean)
    },
    {
      subject: settingsStore.settings.subject,
      source: 'manual',
      intervals: settingsStore.settings.reviewIntervals
    }
  )
  await repos.cards.save(card)
  front.value = ''
  back.value = ''
  tags.value = ''
  message.value = '已加入错题本'
  await browser.value?.reload()
}
</script>

<template>
  <div class="stack">
    <section class="card form-card">
      <div class="section-title">
        <h2>手动录入错题</h2>
        <span class="badge warn">按遗忘曲线复习</span>
      </div>

      <div class="field">
        <label for="front">题目</label>
        <textarea id="front" v-model="front" rows="2" placeholder="题干，支持 LaTeX，例如：$y = 2(x-1)^2 - 3$" />
      </div>

      <div class="field">
        <label for="back">答案与解析</label>
        <textarea
          id="back"
          v-model="back"
          rows="4"
          placeholder="答案、考点、易错点；也可以用拍照答疑的解析直接粘贴过来。"
        />
      </div>

      <div class="row">
        <div class="field grow">
          <label for="tags">标签（空格或逗号分隔）</label>
          <input id="tags" v-model="tags" type="text" placeholder="数学 二次函数 顶点式" />
        </div>
        <button class="btn primary" type="button" @click="addMistake">加入错题本</button>
      </div>

      <p v-if="message" class="hint">{{ message }}</p>
    </section>

    <div class="section-title">
      <h2>错题列表</h2>
    </div>

    <CardBrowser ref="browser" only-type="question" />
  </div>
</template>

<style scoped>
.form-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
</style>
