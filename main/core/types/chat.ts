import type { ProviderProtocol } from './provider'

export type ChatRole = 'system' | 'user' | 'assistant'

export interface ImageInput {
  mimeType: string
  /** 纯 base64（不含 data: 前缀） */
  dataBase64: string
}

export interface AIMessage {
  role: ChatRole
  content: string
  images?: ImageInput[]
}

/**
 * 跨供应商统一的请求结构。
 * 核心层只依赖这些字段，不绑定任何单一厂商。
 */
export interface AIRequest {
  apiKey: string
  modelType: string
  /** 覆盖提供商默认 Base URL，可用于本地模型或第三方兼容网关 */
  customBaseUrl?: string
  protocol?: ProviderProtocol
  messages: AIMessage[]
  systemPrompt?: string
  imageBytes?: ImageInput[]
  /** 必须为 true 时才逐字输出；模型不支持时自动降级为整段返回 */
  stream: boolean
  temperature?: number
  maxTokens?: number
  /** 由提供商配置传入，用于在本地提前拦截不支持的能力 */
  supportsVision?: boolean
  supportsStream?: boolean
  timeoutMs?: number
  signal?: AbortSignal
}
