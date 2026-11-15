import type { ProxyApi } from '@core/types/platform'
import type { AITransport, ProviderHttpRequest, RawStream } from '@core/ai/transport'
import { createAsyncChannel } from '@core/utils/asyncChannel'
import { newId } from '@core/utils/id'

/**
 * 通过 Electron 主进程转发的传输层（仅在用户显式开启本地代理时使用）。
 * 用于绕过浏览器 CORS 限制，也便于访问 localhost 上的 Ollama / LocalAI。
 */
export function createProxyTransport(proxy: ProxyApi): AITransport {
  return {
    async open(request: ProviderHttpRequest, options = {}): Promise<RawStream> {
      const requestId = newId('proxy')
      const channel = createAsyncChannel<string>()

      const unsubscribe = proxy.onEvent((event) => {
        if (event.requestId !== requestId) return
        if (event.type === 'chunk') channel.push(event.data)
        else if (event.type === 'done') channel.close()
        else channel.fail(new Error(event.message))
      })

      const abort = (): void => {
        proxy.abort(requestId)
        channel.close()
      }
      const onAbort = (): void => abort()
      options.signal?.addEventListener('abort', onAbort, { once: true })

      try {
        const result = await proxy.start({
          requestId,
          url: request.url,
          headers: request.headers,
          body: request.body
        })
        return {
          meta: { status: result.status, ok: result.ok, headers: {} },
          chunks: channel,
          abort,
          dispose: () => {
            unsubscribe()
            options.signal?.removeEventListener('abort', onAbort)
          }
        }
      } catch (error) {
        unsubscribe()
        options.signal?.removeEventListener('abort', onAbort)
        throw error
      }
    }
  }
}
