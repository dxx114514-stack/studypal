<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'
import type { AIMessage, ImageInput } from '@core/types/chat'
import { buildChatSystemPrompt } from '@core/prompts/chat'
import type { StoredConversation, StoredMessage } from '@storage/schema'
import { repos } from '@storage/index'
import { runFeature } from '../services/aiRuntime'
import { useAiTask } from '../composables/useAiTask'
import { useSettingsStore } from '../stores/settings'
import ImagePicker from '../components/ImagePicker.vue'
import MarkdownView from '../components/MarkdownView.vue'

const settingsStore = useSettingsStore()
const conversationId = ref<string | null>(null)
const conversations = ref<StoredConversation[]>([])
const messages = ref<StoredMessage[]>([])
const input = ref('')
const image = ref<ImageInput | null>(null)
const scrollArea = ref<HTMLElement | null>(null)

const { output, running, error, run, abort, reset } = useAiTask()

watch([messages, output], async () => {
  await nextTick()
  const element = scrollArea.value
  if (element) element.scrollTop = element.scrollHeight
})

onMounted(async () => {
  await loadConversations()
  const recent = conversations.value[0]
  if (!recent) return
  conversationId.value = recent.id
  messages.value = await repos.conversations.listMessages(recent.id)
})

async function loadConversations(): Promise<void> {
  const all = await repos.conversations.list()
  conversations.value = all.filter((item) => item.feature === 'chat')
}

async function ensureConversation(titleHint?: string): Promise<string> {
  if (conversationId.value) return conversationId.value
  const created = await repos.conversations.create('chat', titleHint?.slice(0, 24) || '新的对话')
  conversationId.value = created.id
  await loadConversations()
  return created.id
}

async function buildMistakeSummary(): Promise<string | undefined> {
  const cards = await repos.cards.listByType('question')
  if (cards.length === 0) return undefined
  return cards
    .slice(0, 3)
    .map((card) => `- ${card.front}`)
    .join('\n')
}

async function send(): Promise<void> {
  const text = input.value.trim()
  if ((!text && !image.value) || running.value) return

  const currentImage = image.value
  const id = await ensureConversation(text || '图片提问')
  const userMessage = await repos.conversations.appendMessage({
    conversationId: id,
    role: 'user',
    content: text || '（图片提问）',
    images: currentImage ? [currentImage] : undefined
  })
  messages.value.push(userMessage)
  input.value = ''
  image.value = null

  const history: AIMessage[] = messages.value
    .filter((message) => !message.error)
    .map((message) => ({
      role: message.role,
      content: message.content,
      images: message.images
    }))

  const systemPrompt = buildChatSystemPrompt({
    stage: settingsStore.settings.stage,
    subject: settingsStore.settings.subject,
    mistakeSummary: await buildMistakeSummary(),
    hasImage: Boolean(currentImage)
  })

  await run(async ({ signal, onDelta }) => {
    const full = await runFeature('chat', {
      systemPrompt,
      messages: history,
      imageBytes: currentImage ? [currentImage] : undefined,
      signal,
      onDelta
    })
    const assistantMessage = await repos.conversations.appendMessage({
      conversationId: id,
      role: 'assistant',
      content: full
    })
    messages.value.push(assistantMessage)
  })
  reset()
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault()
    void send()
  }
}

function newChat(): void {
  abort()
  conversationId.value = null
  messages.value = []
  reset()
}

async function onConversationChange(event: Event): Promise<void> {
  const id = (event.target as HTMLSelectElement).value
  if (!id) {
    newChat()
    return
  }
  abort()
  conversationId.value = id
  messages.value = await repos.conversations.listMessages(id)
  reset()
}

async function deleteCurrentConversation(): Promise<void> {
  const id = conversationId.value
  if (!id) return
  if (!window.confirm('删除该对话及全部消息？此操作不可恢复。')) return
  await repos.conversations.remove(id)
  await loadConversations()
  const recent = conversations.value[0]
  if (recent) {
    conversationId.value = recent.id
    messages.value = await repos.conversations.listMessages(recent.id)
  } else {
    conversationId.value = null
    messages.value = []
  }
  reset()
}
</script>

<template>
  <div class="chat card">
    <header class="chat-head">
      <div class="chat-title">
        <strong>AI 导师</strong>
        <span class="hint">{{ settingsStore.settings.stage }} · 结合错题与图片</span>
      </div>
      <div class="row head-actions">
        <select class="history" :value="conversationId ?? ''" @change="onConversationChange">
          <option value="">新对话</option>
          <option v-for="item in conversations" :key="item.id" :value="item.id">{{ item.title }}</option>
        </select>
        <button
          class="btn sm ghost"
          type="button"
          :disabled="!conversationId"
          @click="deleteCurrentConversation"
        >
          删除
        </button>
        <button class="btn sm ghost" type="button" @click="newChat">新对话</button>
      </div>
    </header>

    <div ref="scrollArea" class="messages">
      <div v-if="messages.length === 0 && !output" class="empty">
        问任何学科问题。可以上传题目截图，AI 会先识别图片再讲解。
      </div>

      <div v-for="message in messages" :key="message.id" class="bubble" :class="message.role">
        <div v-if="message.images?.length" class="bubble-images">
          <img
            v-for="(item, index) in message.images"
            :key="index"
            :src="`data:${item.mimeType};base64,${item.dataBase64}`"
            alt="提问图片"
          />
        </div>
        <MarkdownView v-if="message.role === 'assistant'" :text="message.content" />
        <p v-else class="plain">{{ message.content }}</p>
      </div>

      <div v-if="running || output" class="bubble assistant streaming">
        <MarkdownView :text="output" />
        <span v-if="running" class="spinner" />
      </div>

      <p v-if="error" class="error-box">
        <strong>{{ error.title }}</strong><br />
        {{ error.message }}<br />
        <span class="hint">{{ error.hint }}</span>
      </p>
    </div>

    <footer class="composer">
      <ImagePicker v-model="image" />
      <div class="composer-row">
        <textarea
          v-model="input"
          rows="2"
          placeholder="输入问题，Enter 发送，Shift + Enter 换行"
          @keydown="onKeydown"
        />
        <button class="btn primary" type="button" :disabled="(!input.trim() && !image) || running" @click="send">
          发送
        </button>
        <button v-if="running" class="btn" type="button" @click="abort">停止</button>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.chat {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 150px);
  min-height: 520px;
  padding: 0;
  overflow: hidden;
}

.chat-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 14px 18px;
  border-bottom: 1px solid var(--border);
  flex-wrap: wrap;
}

.chat-title {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.head-actions {
  gap: 6px;
}

.history {
  width: 190px;
  padding: 5px 8px;
  font-size: 13px;
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.bubble {
  max-width: 86%;
  border-radius: 14px;
  padding: 10px 14px;
  font-size: 14.5px;
  background: var(--surface-2);
  border: 1px solid var(--border);
}

.bubble.user {
  align-self: flex-end;
  background: var(--brand);
  border-color: var(--brand);
  color: #fff;
}

.bubble.assistant {
  align-self: flex-start;
}

.bubble.streaming {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.plain {
  margin: 0;
  white-space: pre-wrap;
}

.bubble-images {
  display: flex;
  gap: 6px;
  margin-bottom: 6px;
  flex-wrap: wrap;
}

.bubble-images img {
  max-width: 160px;
  max-height: 120px;
  border-radius: 8px;
  object-fit: cover;
}

.composer {
  border-top: 1px solid var(--border);
  padding: 12px 16px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: var(--surface);
}

.composer-row {
  display: flex;
  gap: 8px;
  align-items: flex-end;
}

.composer-row textarea {
  min-height: 44px;
  max-height: 140px;
}

@media (max-width: 880px) {
  .chat {
    height: calc(100vh - 230px);
    min-height: 420px;
  }

  .messages {
    padding: 12px;
  }

  .bubble {
    max-width: 94%;
  }
}
</style>
