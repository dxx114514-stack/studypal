import type { AIMessage, ImageInput } from '../../types/chat'
import type { ProviderProtocol } from '../../types/provider'
import type { SSEEvent } from '../sse'
import type { ProviderHttpRequest } from '../transport'

/** 归一化后的请求，供各协议适配器构建 HTTP 请求 */
export interface AdapterRequest {
  baseUrl: string
  apiKey: string
  model: string
  systemPrompt: string
  messages: AIMessage[]
  images: ImageInput[]
  stream: boolean
  temperature?: number
  maxTokens?: number
}

export interface AdapterDelta {
  text?: string
  done?: boolean
  error?: string
}

export interface ProviderAdapter {
  protocol: ProviderProtocol
  buildRequest(request: AdapterRequest): ProviderHttpRequest
  parseEvent(event: SSEEvent): AdapterDelta
  extractText(payload: unknown): string
}
