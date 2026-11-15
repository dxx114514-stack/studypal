import type { AIRequest, ImageInput } from '../types/chat'
import type { ProviderProtocol } from '../types/provider'
import { AIError, mapHttpStatus, toAIError } from './errors'
import { getAdapter } from './adapters'
import { createFetchTransport, type AITransport, type RawStream } from './transport'
import { parseSSE } from './sse'

export interface StreamHandlers {
  onDelta?: (text: string) => void
  onFirstToken?: () => void
}

function lastUserImages(request: AIRequest): ImageInput[] {
  const collected: ImageInput[] = [...(request.imageBytes ?? [])]
  request.messages.forEach((message) => {
    if (message.images?.length) collected.push(...message.images)
  })
  return collected
}

/**
 * 统一 AI 客户端：一套请求结构 + 三个协议适配器 + 可替换传输层。
 * 所有功能（答疑 / 批改 / 导图 / 卡片 / 对话）都通过它调用模型。
 */
export class AIClient {
  constructor(private readonly transport: AITransport = createFetchTransport()) {}

  async stream(request: AIRequest, handlers: StreamHandlers = {}): Promise<string> {
    this.validate(request)

    if (lastUserImages(request).length > 0 && request.supportsVision === false) {
      throw new AIError('MODEL_NO_VISION')
    }

    // 模型不支持流式时自动降级，不阻塞用户
    const useStream = request.stream && request.supportsStream !== false
    return useStream ? this.runStream(request, handlers) : this.runComplete(request, handlers)
  }

  async complete(request: AIRequest): Promise<string> {
    return this.stream({ ...request, stream: false })
  }

  private validate(request: AIRequest): void {
    if (!request.apiKey || !request.apiKey.trim()) {
      throw new AIError('INVALID_API_KEY', { message: '尚未配置 API Key' })
    }
    if (!request.modelType || !request.modelType.trim()) {
      throw new AIError('PROVIDER_ERROR', { message: '尚未配置模型名称' })
    }
    if (!Array.isArray(request.messages) || request.messages.length === 0) {
      throw new AIError('PROVIDER_ERROR', { message: '请求消息为空' })
    }
  }

  private buildHttp(request: AIRequest) {
    const protocol: ProviderProtocol = request.protocol ?? 'openai'
    const adapter = getAdapter(protocol)
    return {
      adapter,
      http: adapter.buildRequest({
        baseUrl: request.customBaseUrl ?? '',
        apiKey: request.apiKey,
        model: request.modelType,
        systemPrompt: request.systemPrompt ?? '',
        messages: request.messages,
        images: lastUserImages(request),
        stream: request.stream,
        temperature: request.temperature,
        maxTokens: request.maxTokens
      })
    }
  }

  private async open(request: AIRequest): Promise<RawStream> {
    const { http } = this.buildHttp(request)
    const raw = await this.transport.open(http, {
      signal: request.signal,
      timeoutMs: request.timeoutMs ?? 60_000
    })
    if (!raw.meta.ok) {
      const bodyText = await collect(raw.chunks)
      raw.abort()
      raw.dispose()
      throw mapHttpStatus(raw.meta.status, bodyText)
    }
    return raw
  }

  private async runStream(request: AIRequest, handlers: StreamHandlers): Promise<string> {
    const { adapter } = this.buildHttp(request)
    let raw: RawStream | null = null
    try {
      raw = await this.open(request)
      let full = ''
      let started = false

      for await (const event of parseSSE(raw.chunks)) {
        const delta = adapter.parseEvent(event)
        if (delta.error) {
          throw new AIError('PROVIDER_ERROR', { message: delta.error, status: raw.meta.status })
        }
        if (delta.text) {
          if (!started) {
            started = true
            handlers.onFirstToken?.()
          }
          full += delta.text
          handlers.onDelta?.(delta.text)
        }
        if (delta.done) break
      }

      return full
    } catch (error) {
      throw toAIError(error)
    } finally {
      raw?.abort()
      raw?.dispose()
    }
  }

  private async runComplete(request: AIRequest, handlers: StreamHandlers): Promise<string> {
    let raw: RawStream | null = null
    try {
      raw = await this.open(request)
      const bodyText = await collect(raw.chunks)
      const json = parseJson(bodyText)
      const { adapter } = this.buildHttp(request)
      const text = adapter.extractText(json)
      if (!text) {
        throw new AIError('PROVIDER_ERROR', {
          message: '模型未返回内容',
          detail: bodyText.slice(0, 400)
        })
      }
      handlers.onFirstToken?.()
      handlers.onDelta?.(text)
      return text
    } catch (error) {
      throw toAIError(error)
    } finally {
      raw?.abort()
      raw?.dispose()
    }
  }
}

async function collect(chunks: AsyncIterable<string>): Promise<string> {
  let text = ''
  for await (const chunk of chunks) text += chunk
  return text
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch (error) {
    throw new AIError('JSON_PARSE_FAILED', {
      detail: text.slice(0, 400),
      cause: error
    })
  }
}
