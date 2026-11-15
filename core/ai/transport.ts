import { TimeoutError } from './errors'

/**
 * HTTP 传输层抽象。
 * 默认实现基于 fetch；Electron 可注入「主进程本地代理」实现，
 * 移动端也可注入原生 HTTP 实现，而 core 层代码完全不变。
 */
export interface ProviderHttpRequest {
  url: string
  headers: Record<string, string>
  body: string
}

export interface RawStreamMeta {
  status: number
  ok: boolean
  headers: Record<string, string>
}

export interface RawStream {
  meta: RawStreamMeta
  chunks: AsyncIterable<string>
  abort(): void
  dispose(): void
}

export interface AITransport {
  open(
    request: ProviderHttpRequest,
    options?: { signal?: AbortSignal; timeoutMs?: number }
  ): Promise<RawStream>
}

const DEFAULT_TIMEOUT_MS = 60_000

export function createFetchTransport(fetchImpl: typeof fetch = globalThis.fetch): AITransport {
  return {
    async open(request, options = {}): Promise<RawStream> {
      const controller = new AbortController()
      const external = options.signal
      let timedOut = false

      const onExternalAbort = (): void => controller.abort(external?.reason)
      if (external) {
        if (external.aborted) controller.abort(external.reason)
        else external.addEventListener('abort', onExternalAbort, { once: true })
      }

      const timer = setTimeout(() => {
        timedOut = true
        controller.abort(new TimeoutError())
      }, options.timeoutMs ?? DEFAULT_TIMEOUT_MS)

      try {
        const response = await fetchImpl(request.url, {
          method: 'POST',
          headers: request.headers,
          body: request.body,
          signal: controller.signal
        })
        clearTimeout(timer)
        return {
          meta: {
            status: response.status,
            ok: response.ok,
            headers: toRecord(response.headers)
          },
          chunks: readBodyAsText(response.body),
          abort: (): void => controller.abort(),
          dispose: (): void => {
            clearTimeout(timer)
            external?.removeEventListener('abort', onExternalAbort)
          }
        }
      } catch (error) {
        clearTimeout(timer)
        external?.removeEventListener('abort', onExternalAbort)
        if (timedOut) throw new TimeoutError()
        throw error
      }
    }
  }
}

async function* readBodyAsText(body: ReadableStream<Uint8Array> | null): AsyncGenerator<string> {
  if (!body) return
  const reader = body.getReader()
  const decoder = new TextDecoder()
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      if (value) yield decoder.decode(value, { stream: true })
    }
  } finally {
    reader.releaseLock()
  }
}

function toRecord(headers: Headers): Record<string, string> {
  const record: Record<string, string> = {}
  headers.forEach((value, key) => {
    record[key] = value
  })
  return record
}
