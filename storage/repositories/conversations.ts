import type { FeatureKey } from '../../core/types/provider'
import type { ImageInput } from '../../core/types/chat'
import { newId } from '../../core/utils/id'
import type { StorageDriver } from '../driver'
import type { StoredConversation, StoredMessage } from '../schema'

export interface AppendMessageInput {
  conversationId: string
  role: 'user' | 'assistant'
  content: string
  images?: ImageInput[]
  error?: string
}

export class ConversationRepository {
  constructor(private readonly driver: StorageDriver) {}

  async list(): Promise<StoredConversation[]> {
    const rows = await this.driver.all('conversations')
    return rows.sort((a, b) => b.updatedAt - a.updatedAt)
  }

  async create(feature: FeatureKey, title = '新的对话'): Promise<StoredConversation> {
    const now = Date.now()
    const conversation: StoredConversation = {
      id: newId('conv'),
      title,
      feature,
      createdAt: now,
      updatedAt: now
    }
    await this.driver.put('conversations', conversation)
    return conversation
  }

  async get(id: string): Promise<StoredConversation | undefined> {
    return this.driver.get('conversations', id)
  }

  async rename(id: string, title: string): Promise<void> {
    const conversation = await this.get(id)
    if (!conversation) return
    await this.driver.put('conversations', { ...conversation, title, updatedAt: Date.now() })
  }

  async listMessages(conversationId: string): Promise<StoredMessage[]> {
    const rows = await this.driver.query('messages', (message) => message.conversationId === conversationId)
    return rows.sort((a, b) => a.createdAt - b.createdAt)
  }

  async appendMessage(input: AppendMessageInput): Promise<StoredMessage> {
    const message: StoredMessage = {
      id: newId('msg'),
      conversationId: input.conversationId,
      role: input.role,
      content: input.content,
      images: input.images,
      error: input.error,
      createdAt: Date.now()
    }
    await this.driver.put('messages', message)
    const conversation = await this.get(input.conversationId)
    if (conversation) {
      await this.driver.put('conversations', { ...conversation, updatedAt: Date.now() })
    }
    return message
  }

  async remove(id: string): Promise<void> {
    const messages = await this.listMessages(id)
    for (const message of messages) {
      await this.driver.remove('messages', message.id)
    }
    await this.driver.remove('conversations', id)
  }
}
