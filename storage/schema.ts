import type { ImageInput } from '../core/types/chat'
import type { ReviewCard } from '../core/types/card'
import type { FeatureKey, ProviderConfig, ProviderKeyStorage } from '../core/types/provider'
import type { StudyPlan } from '../core/types/plan'
import type { VocabWord } from '../core/types/vocab'

export const DB_NAME = 'dxxs-studypal'
export const SCHEMA_VERSION = 3
export const SETTINGS_KEY_APP = 'app'

export interface StoredSetting {
  key: string
  value: unknown
  updatedAt: number
}

export interface StoredProvider extends ProviderConfig {
  keyStorage: ProviderKeyStorage
  /** Electron safeStorage 加密后的密文（base64） */
  apiKeyCipher?: string
  /** 无安全存储能力时的明文兜底（仅存本机，绝不上传） */
  apiKeyPlain?: string
}

export interface StoredCard extends ReviewCard {
  /** 冗余字段，便于按到期时间索引排序 */
  dueAt: number
}

export interface StoredNote {
  id: string
  kind: 'mindmap' | 'note'
  title: string
  markdown: string
  createdAt: number
  updatedAt: number
}

export interface StoredConversation {
  id: string
  title: string
  feature: FeatureKey
  createdAt: number
  updatedAt: number
}

export interface StoredMessage {
  id: string
  conversationId: string
  role: 'user' | 'assistant'
  content: string
  images?: ImageInput[]
  error?: string
  createdAt: number
}

export interface TableMap {
  settings: StoredSetting
  providers: StoredProvider
  cards: StoredCard
  notes: StoredNote
  conversations: StoredConversation
  messages: StoredMessage
  plans: StudyPlan
  words: VocabWord
}

export type TableName = keyof TableMap

export const TABLE_NAMES: TableName[] = [
  'settings',
  'providers',
  'cards',
  'notes',
  'conversations',
  'messages',
  'plans',
  'words'
]

/** v1 索引定义，保留用于 Dexie 升级链 */
export const LEGACY_TABLE_SCHEMAS_V1: Record<
  Exclude<TableName, 'plans' | 'words'>,
  string
> = {
  settings: 'key',
  providers: 'id, name, protocol',
  cards: 'id, type, dueAt, subject, createdAt',
  notes: 'id, kind, updatedAt',
  conversations: 'id, updatedAt',
  messages: 'id, conversationId, createdAt'
}

/** v2 索引定义（新增 plans） */
export const LEGACY_TABLE_SCHEMAS_V2: Record<Exclude<TableName, 'words'>, string> = {
  ...LEGACY_TABLE_SCHEMAS_V1,
  plans: 'id, date, done, reminderAt'
}

/** 当前版本索引定义（桌面与移动端一致） */
export const TABLE_SCHEMAS: Record<TableName, string> = {
  ...LEGACY_TABLE_SCHEMAS_V2,
  words: 'id, book, word, createdAt'
}
