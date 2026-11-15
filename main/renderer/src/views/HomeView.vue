<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { STUDY_STAGES, SUBJECTS, stageLabel, subjectLabel } from '@core/types/curriculum'
import { toDateKey } from '@core/utils/date'
import { repos } from '@storage/index'
import { useSettingsStore } from '../stores/settings'
import { useProvidersStore } from '../stores/providers'

const settingsStore = useSettingsStore()
const providersStore = useProvidersStore()

const dueCount = ref(0)
const cardCount = ref(0)
const noteCount = ref(0)
const planTotal = ref(0)
const planDone = ref(0)

const stageText = computed(() => stageLabel(settingsStore.settings.stage))
const subjectText = computed(() => subjectLabel(settingsStore.settings.subject))
const hasProvider = computed(() => providersStore.items.length > 0)
const ready = computed(() => hasProvider.value && providersStore.hasKey(providersStore.items[0].id))

const features = [
  { to: '/plan', title: '学习计划', desc: '按天安排任务，可选定时提醒' },
  { to: '/qa', title: '拍照答疑', desc: '思路提示 / 直接解答，支持图片识别' },
  { to: '/chat', title: 'AI 对话', desc: '多轮上下文，结合错题与图片提问' },
  { to: '/writing', title: '写作批改', desc: '总分 + 分类问题 + 润色范文' },
  { to: '/mindmap', title: '笔记转导图', desc: 'OneLook 兼容 Markdown，一键导出' },
  { to: '/cards', title: '复习卡片', desc: 'AI 生成单词卡 / 错题卡，间隔复习' },
  { to: '/mistakes', title: '错题本', desc: '集中管理题目，按遗忘曲线复习' }
]

onMounted(async () => {
  const [due, allCards, notes, todayPlans] = await Promise.all([
    repos.cards.countDue(),
    repos.cards.listAll(),
    repos.notes.list('mindmap'),
    repos.plans.listByDate(toDateKey())
  ])
  dueCount.value = due
  cardCount.value = allCards.length
  noteCount.value = notes.length
  planTotal.value = todayPlans.length
  planDone.value = todayPlans.filter((plan) => plan.done).length
})
</script>

<template>
  <div class="stack">
    <section class="hero card">
      <div>
        <p class="eyebrow">今天也一起把难点拆开</p>
        <h2>{{ stageText }} · {{ subjectText }}</h2>
        <p class="muted">
          今日计划 {{ planDone }} / {{ planTotal }}；待复习 {{ dueCount }} 张卡片，共 {{ cardCount }} 张；已保存
          {{ noteCount }} 份思维导图。
        </p>
      </div>
      <div class="hero-actions">
        <RouterLink to="/plan" class="btn primary">今日计划</RouterLink>
        <RouterLink to="/qa" class="btn">开始答疑</RouterLink>
      </div>
    </section>

    <section v-if="!hasProvider" class="card notice">
      <div>
        <strong>还没有配置 AI 提供商</strong>
        <p class="muted">StudyPal 不内置任何 Key，也不会中转你的请求。填入自己的 API Key 即可开始。</p>
      </div>
      <RouterLink to="/settings" class="btn primary">去配置</RouterLink>
    </section>

    <section v-else-if="!ready" class="card notice">
      <div>
        <strong>提供商尚未保存 API Key</strong>
        <p class="muted">请到设置页补全 Key，或新增一个可用提供商。</p>
      </div>
      <RouterLink to="/settings" class="btn">去设置</RouterLink>
    </section>

    <section class="grid">
      <RouterLink v-for="feature in features" :key="feature.to" :to="feature.to" class="feature card">
        <h3>{{ feature.title }}</h3>
        <p class="muted">{{ feature.desc }}</p>
        <span class="go">进入 →</span>
      </RouterLink>
    </section>

    <section class="card">
      <div class="section-title">
        <h2>学习阶段</h2>
        <span class="hint">点击切换学段，或在左下角切换（移动端在设置页）</span>
      </div>
      <div class="stages">
        <button
          v-for="stage in STUDY_STAGES"
          :key="stage.id"
          class="stage"
          :class="{ active: settingsStore.settings.stage === stage.id }"
          type="button"
          @click="settingsStore.update({ stage: stage.id })"
        >
          <strong>{{ stage.label }}</strong>
          <span class="hint">{{ stage.description }}</span>
        </button>
      </div>
      <div class="row subjects">
        <button
          v-for="subject in SUBJECTS"
          :key="subject.id"
          class="btn sm"
          :class="{ primary: settingsStore.settings.subject === subject.id }"
          type="button"
          @click="settingsStore.update({ subject: subject.id })"
        >
          {{ subject.label }}
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  background: linear-gradient(120deg, var(--surface), var(--brand-weak));
}

.eyebrow {
  margin: 0 0 4px;
  color: var(--muted);
  font-size: 12.5px;
}

.hero h2 {
  font-size: 22px;
  margin-bottom: 4px;
}

.hero-actions {
  display: flex;
  gap: 10px;
}

.notice {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  border-color: color-mix(in srgb, var(--brand) 45%, var(--border));
}

.notice p {
  margin: 4px 0 0;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 14px;
}

.feature {
  text-decoration: none;
  color: inherit;
  display: flex;
  flex-direction: column;
  gap: 6px;
  transition: transform 0.15s ease, border-color 0.15s ease;
}

.feature:hover {
  transform: translateY(-2px);
  border-color: var(--brand);
}

.feature p {
  margin: 0;
  font-size: 13px;
}

.go {
  margin-top: auto;
  color: var(--brand);
  font-size: 13px;
}

.stages {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 10px;
  margin-bottom: 14px;
}

.stage {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  background: var(--surface-2);
  color: inherit;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
}

.stage.active {
  border-color: var(--brand);
  background: var(--brand-weak);
}

.subjects {
  gap: 8px;
}

@media (max-width: 880px) {
  .hero h2 {
    font-size: 19px;
  }

  .grid {
    grid-template-columns: 1fr 1fr;
  }

  .stages {
    grid-template-columns: 1fr;
  }
}
</style>
