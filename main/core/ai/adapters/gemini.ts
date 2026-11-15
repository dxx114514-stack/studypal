import type { ImageInput } from '../../types/chat'
import type { AdapterDelta, AdapterRequest, ProviderAdapter } from './types'
import { findLastUserIndex, readString, safeParseJson, trimTrailingSlash } from './shared'

interface GeminiPart {
  text?: string
  inlineData?: { mimeType: string; data: string }
}

function buildContents(request: AdapterRequest) {
  const lastUser = findLastUserIndex(request.messages)
  return request.messages
    .map((message, index) => {
      if (message.role === 'system') return null
      const parts: GeminiPart[] = [{ text: message.content }]
      const images: ImageInput[] = [...(message.images ?? [])]
      if (index === lastUser) images.push(...request.images)
      images.forEach((image) => {
        parts.push({ inlineData: { mimeType: image.mimeType, data: image.dataBase64 } })
      })
      return {
        role: message.role === 'assistant' ? 'model' : 'user',
        parts
      }
    })
    .filter((item): item is { role: string; parts: GeminiPart[] } => item !== null)
}

export const geminiAdapter: ProviderAdapter = {
  protocol: 'gemini',

  buildRequest(request: AdapterRequest) {
    const rawBase = trimTrailingSlash(request.baseUrl || 'https://generativelanguage.googleapis.com')
    const base = rawBase.replace(/\/v1beta$/, '')
    const key = encodeURIComponent(request.apiKey)
    const action = request.stream
      ? `streamGenerateContent?alt=sse&key=${key}`
      : `generateContent?key=${key}`

    const body: Record<string, unknown> = {
      contents: buildContents(request),
      generationConfig: {
        ...(request.temperature !== undefined ? { temperature: request.temperature } : {}),
        ...(request.maxTokens !== undefined ? { maxOutputTokens: request.maxTokens } : {})
      }
    }
    if (request.systemPrompt.trim()) {
      body.systemInstruction = { parts: [{ text: request.systemPrompt }] }
    }

    return {
      url: `${base}/v1beta/models/${request.model}:${action}`,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    }
  },

  parseEvent(event): AdapterDelta {
    const data = event.data.trim()
    if (!data) return {}

    const json = safeParseJson(data)
    if (!json) return {}
    if (json.error) return { error: readString(json.error.message) || 'Gemini 返回错误' }

    const candidate = json.candidates?.[0]
    if (!candidate) return {}
    const text = Array.isArray(candidate.content?.parts)
      ? candidate.content.parts.map((part: any) => readString(part?.text)).join('')
      : ''
    return {
      text: text || undefined,
      done: Boolean(candidate.finishReason)
    }
  },

  extractText(payload: unknown): string {
    const json = payload as any
    const parts: unknown = json?.candidates?.[0]?.content?.parts
    if (!Array.isArray(parts)) return ''
    return parts.map((part) => (part && typeof part === 'object' ? readString((part as any).text) : '')).join('')
  }
}
