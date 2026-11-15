<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { CardType, ReviewGrade } from '@core/types/card'
import type { StoredCard } from '@storage/schema'
import { repos } from '@storage/index'
import { describeReviewState } from '@core/srs/algorithm'
import MarkdownView from './MarkdownView.vue'

const props = defineProps<{ onlyType?: CardType }>()

const cards = ref<StoredCard[]>([])
const loading = ref(false)
const errorMessage = ref('')
const revealed = ref<Record<string, boolean>>({})
const filter = ref<'due' | 'all'>('due')

const visibleCards = computed(() => {
  const now = Date.now()
  return filter.value === 'due' ? cards.value.filter((card) => card.dueAt <= now) : cards.value
})

async function load(): Promise<void> {
  loading.value = true
  errorMessage.value = ''
  try {
    cards.value = props.onlyType ? await repos.cards.listByType(props.onlyType) : await repos.cards.listAll()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '读取卡片失败'
  } finally {
    loading.value = false
  }
}

async function grade(card: StoredCard, value: ReviewGrade): Promise<void> {
  try {
    await repos.cards.review(card.id, value, card.reviewIntervals)
    revealed.value[card.id] = false
    await load()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '更新复习计划失败'
  }
}

async function remove(card: StoredCard): Promise<void> {
  await repos.cards.remove(card.id)
  await load()
}

onMounted(load)
defineExpose({ reload: load })
</script>

<template>
  <div class="stack">
    <div class="row">
      <button class="btn sm" :class="{ primary: filter === 'due' }" type="button" @click="filter = 'due'">
        待复习（{{ cards.filter((card) => card.dueAt <= Date.now()).length }}）
      </button>
      <button class="btn sm" :class="{ primary: filter === 'all' }" type="button" @click="filter = 'all'">
        全部（{{ cards.length }}）
      </button>
      <span v-if="loading" class="spinner" />
    </div>

    <p v-if="errorMessage" class="error-box">{{ errorMessage }}</p>

    <div v-if="visibleCards.length === 0 && !loading" class="empty">
      暂无卡片。可以用「拍照答疑」保存错题，或在「复习卡片」页用 AI 生成。
    </div>

    <article v-for="card in visibleCards" :key="card.id" class="card card-item">
      <header class="card-head">
        <span class="badge" :class="card.type === 'word' ? 'ok' : 'warn'">
          {{ card.type === 'word' ? '单词 / 概念' : '错题' }}
        </span>
        <span class="hint">{{ describeReviewState(card.state) }} · 已复习 {{ card.state.reps }} 次</span>
      </header>

      <div class="front"><MarkdownView :text="card.front" /></div>

      <div v-if="revealed[card.id]" class="back">
        <MarkdownView :text="card.back" />
      </div>

      <footer class="card-foot">
        <div class="row">
          <button
            v-if="!revealed[card.id]"
            class="btn sm primary"
            type="button"
            @click="revealed[card.id] = true"
          >
            显示答案
          </button>
          <template v-else>
            <button class="btn sm danger" type="button" @click="grade(card, 'again')">忘了</button>
            <button class="btn sm" type="button" @click="grade(card, 'hard')">困难</button>
            <button class="btn sm" type="button" @click="grade(card, 'good')">一般</button>
            <button class="btn sm" type="button" @click="grade(card, 'easy')">简单</button>
          </template>
        </div>
        <div class="row">
          <span v-for="tag in card.tags" :key="tag" class="badge">{{ tag }}</span>
          <button class="btn sm ghost" type="button" @click="remove(card)">删除</button>
        </div>
      </footer>
    </article>
  </div>
</template>

<style scoped>
.card-item {
  display: flex;
  flex-direction: column;
  gap: 10px;
  box-shadow: none;
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.front {
  font-size: 15px;
  font-weight: 600;
}

.back {
  border-top: 1px dashed var(--border);
  padding-top: 10px;
  background: var(--surface-2);
  border-radius: 10px;
  padding: 10px 12px;
}

.card-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}
</style>
