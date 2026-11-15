<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import type { StudyPlan } from '@core/types/plan'
import { SUBJECTS, subjectLabel } from '@core/types/curriculum'
import { combineDateTime, formatClock, formatDateLabel, toDateKey } from '@core/utils/date'
import { newId } from '@core/utils/id'
import { repos } from '@storage/index'
import { getPlatform } from '../services/platform'
import { useSettingsStore } from '../stores/settings'

const settingsStore = useSettingsStore()
const today = toDateKey()
const selectedDate = ref(today)
const plans = ref<StudyPlan[]>([])
const title = ref('')
const subject = ref(settingsStore.settings.subject)
const time = ref('')
const message = ref('')
let timer: number | undefined

const doneCount = computed(() => plans.value.filter((plan) => plan.done).length)
const progress = computed(() =>
  plans.value.length === 0 ? 0 : Math.round((doneCount.value / plans.value.length) * 100)
)
const isToday = computed(() => selectedDate.value === today)

async function load(): Promise<void> {
  plans.value = await repos.plans.listByDate(selectedDate.value)
}

async function addPlan(): Promise<void> {
  if (!title.value.trim()) {
    message.value = '请填写计划内容'
    return
  }

  let reminderAt: number | undefined
  if (time.value.trim()) {
    reminderAt = combineDateTime(selectedDate.value, time.value.trim())
    if (!reminderAt) {
      message.value = '提醒时间格式应为 HH:mm，例如 19:30'
      return
    }
    if (reminderAt <= Date.now()) {
      message.value = '提醒时间需晚于当前时间'
      return
    }
  }

  const now = Date.now()
  const plan: StudyPlan = {
    id: newId('plan'),
    date: selectedDate.value,
    title: title.value.trim(),
    subject: subject.value,
    done: false,
    reminderAt,
    createdAt: now,
    updatedAt: now
  }
  await repos.plans.save(plan)
  title.value = ''
  time.value = ''
  message.value = '计划已添加'
  await load()
}

async function toggle(plan: StudyPlan, event: Event): Promise<void> {
  await repos.plans.setDone(plan.id, (event.target as HTMLInputElement).checked)
  await load()
}

async function remove(plan: StudyPlan): Promise<void> {
  await repos.plans.remove(plan.id)
  await load()
}

function shiftDay(offset: number): void {
  const date = new Date(`${selectedDate.value}T00:00:00`)
  date.setDate(date.getDate() + offset)
  selectedDate.value = toDateKey(date)
  void load()
}

async function checkReminders(): Promise<void> {
  const now = Date.now()
  const upcoming = await repos.plans.listFromDate(toDateKey())
  const due = upcoming.filter(
    (plan) => !plan.done && plan.reminderAt !== undefined && plan.reminderAt <= now && !plan.notifiedAt
  )
  if (due.length === 0) return

  const platform = await getPlatform()
  for (const plan of due) {
    await platform.notify({
      title: 'StudyPal 学习计划',
      body: `${plan.title}（${subjectLabel(plan.subject)}）`
    })
    await repos.plans.markNotified(plan.id, now)
  }
  await load()
}

onMounted(async () => {
  await load()
  void checkReminders()
  timer = window.setInterval(() => void checkReminders(), 60_000)
})

onUnmounted(() => {
  if (timer) window.clearInterval(timer)
})
</script>

<template>
  <div class="stack">
    <section class="card summary">
      <div>
        <p class="eyebrow">{{ isToday ? '今天的学习安排' : formatDateLabel(selectedDate) }}</p>
        <h2>{{ doneCount }} / {{ plans.length }} 已完成</h2>
        <p class="hint">
          {{ plans.length === 0 ? '还没有计划，先添加一条吧。' : `完成度 ${progress}%` }}
        </p>
      </div>
      <div class="progress" :aria-label="`完成度 ${progress}%`">
        <div class="progress-bar" :style="{ width: `${progress}%` }" />
      </div>
    </section>

    <section class="card">
      <div class="section-title">
        <h2>添加计划</h2>
        <span class="hint">可选定时提醒（应用运行时生效）</span>
      </div>

      <div class="field">
        <label for="plan-title">计划内容</label>
        <input id="plan-title" v-model="title" type="text" placeholder="例如：完成二次函数 10 道题 / 背 20 个单词" />
      </div>

      <div class="grid">
        <div class="field">
          <label for="plan-subject">学科</label>
          <select id="plan-subject" v-model="subject">
            <option v-for="item in SUBJECTS" :key="item.id" :value="item.id">{{ item.label }}</option>
          </select>
        </div>
        <div class="field">
          <label for="plan-date">日期</label>
          <input id="plan-date" v-model="selectedDate" type="date" @change="load" />
        </div>
        <div class="field">
          <label for="plan-time">提醒时间（可选）</label>
          <input id="plan-time" v-model="time" type="time" />
        </div>
      </div>

      <div class="row">
        <button class="btn primary" type="button" @click="addPlan">添加到计划</button>
        <button v-if="message" class="btn ghost sm" type="button" @click="message = ''">{{ message }}</button>
      </div>
    </section>

    <section class="card">
      <div class="section-title">
        <h2>{{ formatDateLabel(selectedDate) }}的计划</h2>
        <div class="row">
          <button class="btn sm ghost" type="button" @click="shiftDay(-1)">前一天</button>
          <button class="btn sm ghost" type="button" @click="selectedDate = today; load()">今天</button>
          <button class="btn sm ghost" type="button" @click="shiftDay(1)">后一天</button>
        </div>
      </div>

      <div v-if="plans.length === 0" class="empty">这一天还没有计划。</div>

      <div v-for="plan in plans" :key="plan.id" class="plan" :class="{ done: plan.done }">
        <label class="check">
          <input type="checkbox" :checked="plan.done" @change="toggle(plan, $event)" />
          <span class="plan-title">{{ plan.title }}</span>
        </label>
        <div class="row">
          <span class="badge">{{ subjectLabel(plan.subject) }}</span>
          <span v-if="plan.reminderAt" class="badge warn">{{ formatClock(plan.reminderAt) }}</span>
          <button class="btn sm ghost" type="button" @click="remove(plan)">删除</button>
        </div>
      </div>
    </section>

    <p class="hint">
      提醒仅在本应用运行时触发；关闭应用后不会推送系统级定时通知。数据只保存在本机。
    </p>
  </div>
</template>

<style scoped>
.summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  flex-wrap: wrap;
}

.eyebrow {
  margin: 0 0 2px;
  color: var(--muted);
  font-size: 12.5px;
}

.summary h2 {
  font-size: 22px;
}

.progress {
  flex: 1;
  min-width: 160px;
  height: 10px;
  border-radius: 999px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, var(--brand), #7aa2ff);
  transition: width 0.3s ease;
}

.grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 12px;
  margin: 12px 0;
}

.plan {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 0;
  border-top: 1px solid var(--border);
  flex-wrap: wrap;
}

.plan.done .plan-title {
  text-decoration: line-through;
  color: var(--muted);
}

.check {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14.5px;
}

.check input {
  width: 17px;
  height: 17px;
  accent-color: var(--brand);
}

@media (max-width: 720px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>
