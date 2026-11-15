/**
 * AI 提供商配置与功能路由。
 */
export type ProviderProtocol = 'openai' | 'anthropic' | 'gemini'

export type FeatureKey = 'qa' | 'writing' | 'mindmap' | 'cards' | 'chat'

export const FEATURE_LABELS: Record<FeatureKey, string> = {
  qa: '拍照答疑',
  writing: '写作批改',
  mindmap: '笔记转导图',
  cards: '复习卡片',
  chat: 'AI 对话'
}

export const FEATURE_KEYS: FeatureKey[] = ['qa', 'writing', 'mindmap', 'cards', 'chat']

/** API Key 在本地仅以密文或明文形式保存，绝不上传 */
export type ProviderKeyStorage = 'none' | 'plain' | 'safe-storage'

export interface ProviderConfig {
  id: string
  name: string
  protocol: ProviderProtocol
  /** 形如 https://api.openai.com/v1，可指向本地 Ollama / LocalAI / vLLM */
  baseUrl: string
  /** 模型标识，例如 gpt-4o-mini、qwen-vl-max、gemini-2.0-flash */
  modelType: string
  supportsVision: boolean
  supportsStream: boolean
  /** 是否经由 Electron 主进程本地代理转发（用于绕过浏览器 CORS 限制） */
  useLocalProxy: boolean
  notes?: string
  createdAt: number
  updatedAt: number
}

export interface ProviderPreset {
  id: string
  name: string
  protocol: ProviderProtocol
  baseUrl: string
  modelType: string
  supportsVision: boolean
  supportsStream: boolean
  notes: string
}
