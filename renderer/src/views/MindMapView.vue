<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { StoredNote } from '@storage/schema'
import { repos } from '@storage/index'
import {
  parseMarkdownToTree,
  treeToHeadingMarkdown,
  treeToJson,
  treeToOnelookMarkdown
} from '@core/markdown-tree'
import { buildMindMapPrompt } from '@core/prompts/mindmap'
import { newId } from '@core/utils/id'
import { runFeature } from '../services/aiRuntime'
import { useAiTask } from '../composables/useAiTask'
import { useSettingsStore } from '../stores/settings'
import { getPlatform } from '../services/platform'
import { serializeSvg, svgToPngBase64 } from '../services/imageExport'
import MarkdownView from '../components/MarkdownView.vue'
import MindMapCanvas from '../components/MindMapCanvas.vue'

const SAMPLE = `# 二次函数
## 基本概念
- 一般式：$y = ax^2 + bx + c$
- 顶点式：$y = a(x-h)^2 + k$
- 交点式：$y = a(x-x_1)(x-x_2)$
## 图像性质
- 开口方向由 $a$ 决定
- 对称轴：$x = -\\frac{b}{2a}$
- 顶点坐标：$(h, k)$
## 常见题型
- 求解析式
- 求最值
- 判断图像位置
- 与方程、不等式结合`

const settingsStore = useSettingsStore()
const title = ref('二次函数')
const source = ref('')
const markdown = ref(SAMPLE)
const tab = ref<'map' | 'markdown'>('map')
const notes = ref<StoredNote[]>([])
const activeNoteId = ref<string | null>(null)
const message = ref('')
const canvas = ref<{ getSvg: () => SVGSVGElement | null } | null>(null)

const { running, error, run, abort } = useAiTask()

const root = computed(() =>
  markdown.value.trim()
    ? parseMarkdownToTree(markdown.value, { rootTitle: title.value || '思维导图' })
    : null
)

onMounted(loadNotes)

async function loadNotes(): Promise<void> {
  notes.value = await repos.notes.list('mindmap')
}

function cleanMarkdown(text: string): string {
  const trimmed = text.trim()
  const fenced = trimmed.match(/^```[a-zA-Z0-9_-]*\s*\n([\s\S]*?)\n?```$/)
  return (fenced ? fenced[1] : trimmed).trim()
}

async function generate(): Promise<void> {
  const material = source.value.trim() || markdown.value
  if (!material.trim() || running.value) return
  message.value = ''
  const prompt = buildMindMapPrompt({
    stage: settingsStore.settings.stage,
    subject: settingsStore.settings.subject,
    source: material,
    title: title.value,
    maxDepth: 4
  })

  await run(async ({ signal, onDelta }) => {
    const full = await runFeature('mindmap', {
      systemPrompt: prompt.system,
      messages: [{ role: 'user', content: prompt.user }],
      signal,
      onDelta
    })
    markdown.value = cleanMarkdown(full)
    tab.value = 'map'
  })
}

async function importFile(): Promise<void> {
  const platform = await getPlatform()
  const file = await platform.openFile({ extensions: ['md', 'markdown', 'txt'] })
  if (!file?.text) return
  source.value = file.text
  if (!title.value.trim()) title.value = file.name.replace(/\.(md|markdown|txt)$/i, '')
  message.value = `已导入 ${file.name}`
}

function safeTitle(): string {
  return (title.value || '思维导图').replace(/[\\/:*?"<>|]/g, '_')
}

async function exportMarkdown(kind: 'heading' | 'onelook'): Promise<void> {
  if (!root.value) return
  const platform = await getPlatform()
  const text = kind === 'onelook' ? treeToOnelookMarkdown(root.value) : treeToHeadingMarkdown(root.value)
  await platform.saveFile({
    defaultName: `${safeTitle()}-${kind === 'onelook' ? 'onelook' : 'outline'}.md`,
    text,
    mimeType: 'text/markdown',
    filters: [{ name: 'Markdown', extensions: ['md'] }]
  })
  message.value = 'Markdown 已导出'
}

async function exportJson(): Promise<void> {
  if (!root.value) return
  const platform = await getPlatform()
  await platform.saveFile({
    defaultName: `${safeTitle()}.json`,
    text: treeToJson(root.value),
    mimeType: 'application/json',
    filters: [{ name: 'JSON', extensions: ['json'] }]
  })
  message.value = 'JSON 已导出'
}

async function exportSvg(): Promise<void> {
  const svg = canvas.value?.getSvg()
  if (!svg) return
  const platform = await getPlatform()
  await platform.saveFile({
    defaultName: `${safeTitle()}.svg`,
    text: serializeSvg(svg),
    mimeType: 'image/svg+xml',
    filters: [{ name: 'SVG', extensions: ['svg'] }]
  })
  message.value = 'SVG 已导出'
}

async function exportPng(): Promise<void> {
  const svg = canvas.value?.getSvg()
  if (!svg) return
  const platform = await getPlatform()
  const base64 = await svgToPngBase64(svg)
  await platform.saveFile({
    defaultName: `${safeTitle()}.png`,
    dataBase64: base64,
    mimeType: 'image/png',
    filters: [{ name: 'PNG', extensions: ['png'] }]
  })
  message.value = 'PNG 已导出'
}

async function saveNote(): Promise<void> {
  if (!markdown.value.trim()) return
  const now = Date.now()
  const existing = notes.value.find((note) => note.id === activeNoteId.value)
  const note: StoredNote = {
    id: activeNoteId.value ?? newId('note'),
    kind: 'mindmap',
    title: title.value || '未命名导图',
    markdown: markdown.value,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now
  }
  await repos.notes.save(note)
  activeNoteId.value = note.id
  await loadNotes()
  message.value = '已保存到本地'
}

function openNote(note: StoredNote): void {
  activeNoteId.value = note.id
  title.value = note.title
  markdown.value = note.markdown
  source.value = ''
  tab.value = 'map'
}

async function removeNote(note: StoredNote): Promise<void> {
  await repos.notes.remove(note.id)
  if (activeNoteId.value === note.id) activeNoteId.value = null
  await loadNotes()
}
</script>

<template>
  <div class="layout">
    <section class="card panel">
      <div class="section-title">
        <h2>原始材料</h2>
        <span class="badge">{{ settingsStore.settings.subject }}</span>
      </div>

      <div class="field">
        <label for="map-title">导图标题</label>
        <input id="map-title" v-model="title" type="text" placeholder="例如：二次函数" />
      </div>

      <div class="field">
        <label for="map-source">笔记 / OCR 文本 / 课件内容</label>
        <textarea
          id="map-source"
          v-model="source"
          rows="9"
          placeholder="粘贴手写笔记 OCR 文本、Markdown 或课件识别文本；留空则直接整理右侧 Markdown。"
        />
      </div>

      <div class="row">
        <button class="btn primary" type="button" :disabled="running" @click="generate">
          <span v-if="running" class="spinner" />
          {{ running ? 'AI 整理中…' : 'AI 整理成导图' }}
        </button>
        <button v-if="running" class="btn" type="button" @click="abort">停止</button>
        <button class="btn" type="button" @click="importFile">导入 .md</button>
      </div>

      <p v-if="error" class="error-box">
        <strong>{{ error.title }}</strong><br />
        {{ error.message }}
      </p>
      <p v-if="message" class="hint">{{ message }}</p>

      <div class="notes">
        <div class="section-title">
          <h2>本地导图</h2>
          <button class="btn sm" type="button" @click="saveNote">保存当前</button>
        </div>
        <div v-if="notes.length === 0" class="hint">还没有保存的导图。</div>
        <div v-for="note in notes" :key="note.id" class="note-row">
          <button class="note-link" type="button" @click="openNote(note)">{{ note.title }}</button>
          <button class="btn sm ghost" type="button" @click="removeNote(note)">删除</button>
        </div>
      </div>
    </section>

    <section class="card panel">
      <div class="section-title">
        <div class="tabs">
          <button class="btn sm" :class="{ primary: tab === 'map' }" type="button" @click="tab = 'map'">
            导图
          </button>
          <button
            class="btn sm"
            :class="{ primary: tab === 'markdown' }"
            type="button"
            @click="tab = 'markdown'"
          >
            Markdown
          </button>
        </div>
        <span class="hint">OneLook / Markmap / Obsidian 兼容</span>
      </div>

      <div v-show="tab === 'map'">
        <MindMapCanvas ref="canvas" :root="root" />
      </div>

      <div v-show="tab === 'markdown'" class="markdown-tab">
        <textarea v-model="markdown" rows="18" class="code" />
        <div class="preview card">
          <MarkdownView :text="markdown" />
        </div>
      </div>

      <div class="row export-row">
        <button class="btn sm" type="button" @click="exportMarkdown('heading')">导出标题版 .md</button>
        <button class="btn sm" type="button" @click="exportMarkdown('onelook')">导出 OneLook .md</button>
        <button class="btn sm" type="button" @click="exportJson">导出 .json</button>
        <button class="btn sm" type="button" @click="exportSvg">导出 .svg</button>
        <button class="btn sm" type="button" @click="exportPng">导出 .png</button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.layout {
  display: grid;
  grid-template-columns: minmax(0, 380px) minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.tabs {
  display: flex;
  gap: 6px;
}

.markdown-tab {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.code {
  font-family: var(--mono);
  font-size: 13px;
  min-height: 260px;
}

.preview {
  box-shadow: none;
  max-height: 280px;
  overflow-y: auto;
  background: var(--surface-2);
}

.notes {
  border-top: 1px dashed var(--border);
  padding-top: 12px;
}

.note-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 4px 0;
}

.note-link {
  background: none;
  border: none;
  color: var(--brand);
  font-family: inherit;
  font-size: 13.5px;
  cursor: pointer;
  padding: 2px 0;
  text-align: left;
}

.export-row {
  gap: 6px;
}

@media (max-width: 1080px) {
  .layout {
    grid-template-columns: 1fr;
  }
}
</style>
