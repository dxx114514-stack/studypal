import type { ImageInput } from '../../types/chat'
import type { AdapterDelta, AdapterRequest, ProviderAdapter } from './types'
import { findLastUserIndex, readString, safeParseJson, toDataUrl, trimTrailingSlash } from './shared'

interface OpenAIContentPart {
  type: 'text' | 'image_url'
  text?: string
  image_url?: { url: string }
}

interface OpenAIMessage {
  role: 'user' | 'assistant'
  content: string | OpenAIContentPart[]
}

function buildMessages(request: AdapterRequest): OpenAIMessage[] {
  const lastUser = findLastUserIndex(request.messages)
  const result: OpenAIMessage[] = []

  request.messages.forEach((message, index) => {
    if (message.role === 'system') return
    const images: ImageInput[] = [...(message.images ?? [])]
    if (index === lastUser) images.push(...request.images)
    if (images.length === 0) {
      result.push({ role: message.role, content: message.content })
      return
    }
    result.push({
      role: message.role,
      content: [
        { type: 'text', text: message.content },
        ...images.map<OpenAIContentPart>((image) => ({
          type: 'image_url',
          image_url: { url: toDataUrl(image) }
        }))
      ]
    })
  })

  return result
}

export const openAIAdapter: ProviderAdapter = {
  protocol: 'openai',

  buildRequest(request: AdapterRequest) {
    const base = trimTrailingSlash(request.baseUrl || 'https://api.openai.com/v1')
    const messages: { role: string; content: unknown }[] = []
    if (request.systemPrompt.trim()) {
      messages.push({ role: 'system', content: request.systemPrompt })
    }
    messages.push(...buildMessages(request))

    const body: Record<string, unknown> = {
      model: request.model,
      messages,
      stream: request.stream
    }
    if (request.temperature !== undefined) body.temperature = request.temperature
    if (request.maxTokens !== undefined) body.max_tokens = request.maxTokens

    return {
      url: `${base}/chat/completions`,
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${request.apiKey}`
      },
      body: JSON.stringify(body)
    }
  },

  parseEvent(event): AdapterDelta {
    const data = event.data.trim()
    if (!data) return {}
    if (data === '[DONE]') return { done: true }

    const json = safeParseJson(data)
    if (!json) return {}
    if (json.error) return { error: readString(json.error.message) || '模型服务返回错误' }

    const choice = json.choices?.[0]
    if (!choice) return {}
    const text = readString(choice.delta?.content)
    return {
      text: text || undefined,
      done: Boolean(choice.finish_reason)
    }
  },

  extractText(payload: unknown): string {
    const json = payload as any
    return readString(json?.choices?.[0]?.message?.content)
  }
}
