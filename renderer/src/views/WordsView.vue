<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { QuizMode, QuizQuestion, WordBookSummary } from '@core/types/vocab'
import { parseWordList } from '@core/vocab/parse'
import { buildQuiz, DEFAULT_QUIZ_COUNT, gradeTextInput } from '@core/vocab/quiz'
import { repos } from '@storage/index'
import { getPlatform } from '../services/platform'

const MODES: { id: QuizMode; label: string; hint: string }[] = [
  { id: 'en-zh', label: '英文选中文', hint: '看英文，选出正确释义' },
  { id: 'zh-en', label: '中文选英文', hint: '看释义，选出对应单词' },
  { id: 'zh-input', label: '输入英文', hint: '看释义，手写拼出单词' }
]

const SAMPLE = `abandon,v. 放弃；抛弃
benefit,n. 益处；v. 有益于
curious,adj. 好奇的
determine,v. 决定；查明`

const tab = ref<'books' | 'quiz'>('books')
const books = ref<WordBookSummary[]>([])
const loading = ref(false)

const bookName = ref('我的词库')
const source = ref('')
const importMessage = ref('')
const importing = ref(false)

const selectedBook = ref('')
const mode = ref<QuizMode>('en-zh')
const count = ref(DEFAULT_QUIZ_COUNT)
const questions = ref<QuizQuestion[]>([])
const index = ref(0)
const selectedChoice = ref<number | null>(null)
const inputAnswer = ref('')
const answered = ref(false)
const lastCorrect = ref(false)
const wrongList = ref<{ prompt: string; answer: string; given: string }[]>([])
const finished = ref(false)

const current = computed(() => questions.value[index.value] ?? null)
const progress = computed(() => (questions.value.length ? `${index.value + 1} / ${questions.value.length}` : '0 / 0'))
const score = computed(() => questions.value.length - wrongList.value.length)
const modeHint = computed(() => MODES.find((item) => item.id === mode.value)?.hint ?? '')

onMounted(refreshBooks)

async function refreshBooks(): Promise<void> {
  loading.value = true
  try {
    books.value = await repos.words.listBooks()
    if (!selectedBook.value && books.value.length > 0) selectedBook.value = books.value[0].book
  } finally {
    loading.value = false
  }
}

async function importFromText(): Promise<void> {
  const text = source.value.trim()
  if (!text) {
    importMessage.value = '请先粘贴词库内容'
    return
  }
  const name = bookName.value.trim()
  if (!name) {
    importMessage.value = '请填写词库名称'
    return
  }

  const { entries, skipped } = parseWordList(text)
  if (entries.length === 0) {
    importMessage.value = `没有识别到有效词条，跳过 ${skipped} 行。格式示例：abandon,v. 放弃`
    return
  }

  importing.value = true
  try {
    const result = await repos.words.importEntries(name, entries)
    importMessage.value = `导入完成：新增 ${result.added} 条，重复或无效 ${result.skipped + skipped} 条`
    source.value = ''
    await refreshBooks()
    selectedBook.value = name
  } finally {
    importing.value = false
  }
}

async function importFromFile(): Promise<void> {
  const platform = await getPlatform()
  const file = await platform.openFile({ extensions: ['csv', 'tsv', 'txt'] })
  if (!file?.text) return
  source.value = file.text
  if (bookName.value === '我的词库') bookName.value = file.name.replace(/\.[^.]+$/, '')
  importMessage.value = `已读取 ${file.name}，确认内容后点击「导入词库」`
}

async function removeBook(book: string): Promise<void> {
  if (!window.confirm(`删除词库「${book}」及其全部单词？`)) return
  await repos.words.removeBook(book)
  await refreshBooks()
  if (selectedBook.value === book) {
    selectedBook.value = books.value[0]?.book ?? ''
    resetQuiz()
  }
  importMessage.value = `已删除词库「${book}」`
}

async function startQuiz(book = selectedBook.value): Promise<void> {
  if (!book) return
  const words = await repos.words.listByBook(book)
  if (words.length === 0) {
    importMessage.value = '该词库还没有单词'
    return
  }
  selectedBook.value = book
  questions.value = buildQuiz(words, { mode: mode.value, count: count.value })
  tab.value = 'quiz'
  resetQuizState()
}

function resetQuizState(): void {
  index.value = 0
  selectedChoice.value = null
  inputAnswer.value = ''
  answered.value = false
  lastCorrect.value = false
  wrongList.value = []
  finished.value = false
}

function resetQuiz(): void {
  questions.value = []
  resetQuizState()
}

function choose(choiceIndex: number): void {
  if (answered.value || !current.value) return
  const choice = current.value.choices[choiceIndex]
  selectedChoice.value = choiceIndex
  answered.value = true
  lastCorrect.value = choice.correct
  if (!choice.correct) recordWrong(choice.text)
}

function submitInput(): void {
  if (answered.value || !current.value) return
  const given = inputAnswer.value.trim()
  if (!given) return
  answered.value = true
  lastCorrect.value = gradeTextInput(given, current.value.answer)
  if (!lastCorrect.value) recordWrong(given)
}

function recordWrong(given: string): void {
  if (!current.value) return
  wrongList.value.push({
    prompt: current.value.prompt,
    answer: current.value.answer,
    given
  })
}

function nextQuestion(): void {
  if (index.value + 1 >= questions.value.length) {
    finished.value = true
    return
  }
  index.value += 1
  selectedChoice.value = null
  inputAnswer.value = ''
  answered.value = false
  lastCorrect.value = false
}
</script>

<template>
  <div class="words">
    <div class="tabs">
      <button class="tab" :class="{ active: tab === 'books' }" @click="tab = 'books'">词库管理</button>
      <button class="tab" :class="{ active: tab === 'quiz' }" @click="tab = 'quiz'">开始背诵</button>
    </div>

    <!-- 词库管理 -->
    <section v-if="tab === 'books'" class="panel">
      <h2>导入词库</h2>
      <p class="hint">
        每行一条，支持 <code>单词,释义</code>、制表符分隔，或「单词 + 至少两个空格 + 释义」。
        首行的 word / 中文 表头会自动跳过，重复单词不会重复导入。
      </p>

      <div class="row">
        <label class="field">
          <span>词库名称</span>
          <input v-model="bookName" type="text" placeholder="例如：高考核心词汇" />
        </label>
        <button class="btn ghost" type="button" @click="importFromFile">从文件导入</button>
      </div>

      <label class="field">
        <span>词库内容</span>
        <textarea v-model="source" rows="8" :placeholder="SAMPLE"></textarea>
      </label>

      <div class="row">
        <button class="btn primary" type="button" :disabled="importing" @click="importFromText">
          {{ importing ? '导入中…' : '导入词库' }}
        </button>
        <button class="btn ghost sm" type="button" @click="source = SAMPLE">填入示例</button>
      </div>

      <p v-if="importMessage" class="message">{{ importMessage }}</p>

      <h2 class="section-title">我的词库</h2>
      <p v-if="loading" class="hint">读取中…</p>
      <p v-else-if="books.length === 0" class="hint">还没有词库，先在上方导入一份。</p>
      <ul v-else class="book-list">
        <li v-for="item in books" :key="item.book" class="book">
          <div>
            <strong>{{ item.book }}</strong>
            <span class="count">{{ item.count }} 词</span>
          </div>
          <div class="book-actions">
            <button class="btn sm" type="button" @click="startQuiz(item.book)">开始背</button>
            <button class="btn sm ghost" type="button" @click="removeBook(item.book)">删除</button>
          </div>
        </li>
      </ul>
    </section>

    <!-- 测验 -->
    <section v-else class="panel">
      <div class="quiz-bar">
        <label class="field inline">
          <span>词库</span>
          <select v-model="selectedBook">
            <option v-for="item in books" :key="item.book" :value="item.book">
              {{ item.book }}（{{ item.count }}）
            </option>
          </select>
        </label>

        <label class="field inline">
          <span>题型</span>
          <select v-model="mode">
            <option v-for="item in MODES" :key="item.id" :value="item.id">{{ item.label }}</option>
          </select>
        </label>

        <label class="field inline">
          <span>题量</span>
          <select v-model.number="count">
            <option :value="10">10 题</option>
            <option :value="20">20 题</option>
            <option :value="30">30 题</option>
          </select>
        </label>

        <button class="btn primary" type="button" :disabled="!selectedBook" @click="startQuiz()">
          {{ questions.length && !finished ? '重新开始' : '开始测验' }}
        </button>
      </div>

      <p class="hint">{{ modeHint }}</p>

      <div v-if="!current && !finished" class="empty">
        <p>选择词库与题型后开始测验。</p>
        <p v-if="books.length === 0">当前没有词库，请先到「词库管理」导入。</p>
      </div>

      <div v-else-if="finished" class="result">
        <h2>本轮完成</h2>
        <p class="score">{{ score }} / {{ questions.length }}</p>
        <p class="hint">正确率 {{ questions.length ? Math.round((score / questions.length) * 100) : 0 }}%</p>

        <ul v-if="wrongList.length" class="wrong-list">
          <li v-for="(item, i) in wrongList" :key="i">
            <span class="wrong-prompt">{{ item.prompt }}</span>
            <span class="wrong-answer">正确：{{ item.answer }}</span>
            <span class="wrong-given">你的答案：{{ item.given }}</span>
          </li>
        </ul>
        <p v-else class="all-right">全部答对。</p>

        <div class="row">
          <button class="btn primary" type="button" @click="startQuiz()">再来一轮</button>
          <button class="btn ghost" type="button" @click="resetQuiz(); tab = 'books'">返回词库</button>
        </div>
      </div>

      <div v-else-if="current" class="question">
        <p class="progress">第 {{ progress }} 题 · {{ MODES.find((m) => m.id === current?.mode)?.label }}</p>
        <p class="prompt">{{ current.prompt }}</p>

        <div v-if="current.mode !== 'zh-input'" class="choices">
          <button
            v-for="(choice, i) in current.choices"
            :key="i"
            class="choice"
            type="button"
            :class="{
              correct: answered && choice.correct,
              wrong: answered && selectedChoice === i && !choice.correct
            }"
            :disabled="answered"
            @click="choose(i)"
          >
            {{ choice.text }}
          </button>
        </div>

        <form v-else class="input-row" @submit.prevent="submitInput">
          <input
            v-model="inputAnswer"
            type="text"
            autocomplete="off"
            autocapitalize="off"
            spellcheck="false"
            :disabled="answered"
            placeholder="输入英文单词"
          />
          <button class="btn primary" type="submit" :disabled="answered || !inputAnswer.trim()">提交</button>
        </form>

        <div v-if="answered" class="feedback" :class="{ ok: lastCorrect, bad: !lastCorrect }">
          <p v-if="lastCorrect">回答正确</p>
          <p v-else>回答错误，正确答案是 <strong>{{ current.answer }}</strong></p>
          <button class="btn primary sm" type="button" @click="nextQuestion">
            {{ index + 1 >= questions.length ? '查看结果' : '下一题' }}
          </button>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.words {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.tabs {
  display: inline-flex;
  gap: 4px;
  padding: 4px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 12px;
  width: fit-content;
}

.tab {
  border: none;
  background: transparent;
  color: var(--muted);
  font-size: 14px;
  font-weight: 600;
  padding: 7px 16px;
  border-radius: 9px;
  cursor: pointer;
}

.tab.active {
  background: var(--surface);
  color: var(--brand-strong);
  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.12);
}

.panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 22px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.panel h2 {
  font-size: 16px;
  margin: 0;
}

.section-title {
  margin-top: 8px !important;
}

.hint {
  margin: 0;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.7;
}

.hint code {
  background: var(--surface-2);
  padding: 1px 5px;
  border-radius: 4px;
}

.row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 10px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  color: var(--muted);
  flex: 1;
  min-width: 160px;
}

.field.inline {
  flex: 0 0 auto;
  min-width: 130px;
}

.field input,
.field select,
.field textarea {
  font-family: inherit;
  font-size: 14px;
  color: var(--text);
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 9px;
  padding: 9px 11px;
  width: 100%;
}

.field textarea {
  resize: vertical;
  line-height: 1.6;
}

.message {
  margin: 0;
  font-size: 13px;
  color: var(--brand-strong);
}

.book-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.book {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: 11px;
  background: var(--surface-2);
}

.count {
  margin-left: 10px;
  font-size: 12px;
  color: var(--muted);
}

.book-actions {
  display: flex;
  gap: 8px;
}

.quiz-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 12px;
}

.empty {
  padding: 28px 0;
  text-align: center;
  color: var(--muted);
  font-size: 14px;
}

.question {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-top: 8px;
}

.progress {
  margin: 0;
  font-size: 12px;
  color: var(--muted);
}

.prompt {
  margin: 0;
  font-size: 30px;
  font-weight: 700;
  line-height: 1.35;
  letter-spacing: -0.2px;
}

.choices {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.choice {
  text-align: left;
  padding: 13px 16px;
  font-size: 14.5px;
  color: var(--text);
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 11px;
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease;
}

.choice:hover:not(:disabled) {
  border-color: var(--brand);
}

.choice:disabled {
  cursor: default;
}

.choice.correct {
  border-color: #2f9e6a;
  background: rgba(47, 158, 106, 0.12);
}

.choice.wrong {
  border-color: #d9534f;
  background: rgba(217, 83, 79, 0.12);
}

.input-row {
  display: flex;
  gap: 10px;
}

.input-row input {
  flex: 1;
  font-size: 18px;
  padding: 12px 14px;
  color: var(--text);
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 11px;
}

.feedback {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 11px;
  border: 1px solid var(--border);
  background: var(--surface-2);
  font-size: 14px;
}

.feedback.ok {
  border-color: rgba(47, 158, 106, 0.5);
}

.feedback.bad {
  border-color: rgba(217, 83, 79, 0.5);
}

.feedback p {
  margin: 0;
}

.result {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 8px;
}

.result h2 {
  margin: 0;
}

.score {
  margin: 0;
  font-size: 40px;
  font-weight: 800;
  letter-spacing: -1px;
}

.wrong-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.wrong-list li {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 11px 14px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface-2);
  font-size: 13.5px;
}

.wrong-prompt {
  font-weight: 600;
}

.wrong-answer {
  color: #2f9e6a;
}

.wrong-given {
  color: var(--muted);
  text-decoration: line-through;
}

.all-right {
  margin: 0;
  color: #2f9e6a;
  font-size: 14px;
}

@media (max-width: 720px) {
  .prompt {
    font-size: 24px;
  }

  .quiz-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .field.inline {
    min-width: 0;
  }
}
</style>
