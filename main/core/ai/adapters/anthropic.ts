import type { ImageInput } from '../../types/chat'
import type { AdapterDelta, AdapterRequest, ProviderAdapter } from './types'
import { findLastUserIndex, readString, safeParseJson, trimTrailingSlash } from './shared'

interface AnthropicBlock {
  type: 'text' | 'image'
  text?: string
  source?: { type: 'base64'; media_type: string; data: string }
}

interface AnthropicMessage {
  role: 'user' | 'assistant'
  content: AnthropicBlock[]
}

/**
 * Anthropic 官方接口默认拒绝浏览器直连，
 * 需要 anthropic-dangerous-direct-browser-access 头（用户自带 Key，非中转）。
 */
function buildMessages(request: AdapterRequest): AnthropicMessage[] {
  const lastUser = findLastUserIndex(request.messages)
  const result: AnthropicMessage[] = []

  request.messages.forEach((message, index) => {
    if (message.role === 'system') return
    const blocks: AnthropicBlock[] = [{ type: 'text', text: message.content || ' ' }]
    const images: ImageInput[] = [...(message.images ?? [])]
    if (index === lastUser) images.push(...request.images)
    images.forEach((image) => {
      blocks.push({
        type: 'image',
        source: { type: 'base64', media_type: image.mimeType, data: image.dataBase64 }
      })
    })
    result.push({ role: message.role, content: blocks })
  })

  return result
}

export const anthropicAdapter: ProviderAdapter = {
  protocol: 'anthropic',

  buildRequest(request: AdapterRequest) {
    const base = trimTrailingSlash(request.baseUrl || 'https://api.anthropic.com')
    const url = base.endsWith('/v1') ? `${base}/messages` : `${base}/v1/messages`

    const body: Record<string, unknown> = {
      model: request.model,
      max_tokens: request.maxTokens ?? 4096,
      messages: buildMessages(request),
      stream: request.stream
    }
    if (request.systemPrompt.trim()) body.system = request.systemPrompt
    if (request.temperature !== undefined) body.temperature = request.temperature

    return {
      url,
      headers: {
        'content-type': 'application/json',
        'x-api-key': request.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify(body)
    }
  },

  parseEvent(event): AdapterDelta {
    const data = event.data.trim()
    if (!data) return {}

    const json = safeParseJson(data)
    if (!json) return {}
    if (json.type === 'error') {
      return { error: readString(json.error?.message) || 'Anthropic 返回错误' }
    }
    if (json.type === 'content_block_delta') {
      return { text: readString(json.delta?.text) || undefined }
    }
    if (json.type === 'message_stop') return { done: true }
    if (json.type === 'message_delta' && json.delta?.stop_reason) return { done: true }
    return {}
  },

  extractText(payload: unknown): string {
    const json = payload as any
    const blocks: unknown = json?.content
    if (!Array.isArray(blocks)) return ''
    return blocks
      .map((block) => (block && typeof block === 'object' ? readString((block as any).text) : ''))
      .join('')
  }
}
