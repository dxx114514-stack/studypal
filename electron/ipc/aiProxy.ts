import { ipcMain, type WebContents } from 'electron'
import { IPC } from '../bridge'
import type { ProxyStreamEvent, ProxyStreamPayload } from '../../core/types/platform'

const sessions = new Map<string, AbortController>()
const ALLOWED_PROTOCOLS = /^https?:\/\//i

/**
 * 可选的本地代理：仅当用户在设置中显式开启时，渲染进程才会经由主进程转发请求。
 * 主进程只做透明转发，不记录、不修改、不上传任何请求内容或密钥。
 */
export function registerProxyIpc(): void {
  ipcMain.handle(IPC.proxyStart, async (event, payload: ProxyStreamPayload) => {
    if (!ALLOWED_PROTOCOLS.test(payload.url)) {
      throw new Error('只允许代理 http/https 请求')
    }

    const controller = new AbortController()
    sessions.set(payload.requestId, controller)

    let response: Response
    try {
      response = await fetch(payload.url, {
        method: 'POST',
        headers: payload.headers,
        body: payload.body,
        signal: controller.signal
      })
    } catch (error) {
      sessions.delete(payload.requestId)
      const message = error instanceof Error ? error.message : String(error)
      send(event.sender, { requestId: payload.requestId, type: 'error', message })
      throw error
    }

    void pump(event.sender, response, payload.requestId, controller)
    return { status: response.status, ok: response.ok }
  })

  ipcMain.on(IPC.proxyAbort, (_event, requestId: string) => {
    sessions.get(requestId)?.abort()
    sessions.delete(requestId)
  })
}

async function pump(
  sender: WebContents,
  response: Response,
  requestId: string,
  controller: AbortController
): Promise<void> {
  try {
    if (!response.body) {
      send(sender, { requestId, type: 'done' })
      return
    }
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      if (value) {
        send(sender, {
          requestId,
          type: 'chunk',
          data: decoder.decode(value, { stream: true })
        })
      }
    }
    send(sender, { requestId, type: 'done' })
  } catch (error) {
    if (!controller.signal.aborted) {
      const message = error instanceof Error ? error.message : String(error)
      send(sender, { requestId, type: 'error', message })
    }
  } finally {
    sessions.delete(requestId)
  }
}

function send(sender: WebContents, event: ProxyStreamEvent): void {
  if (!sender.isDestroyed()) sender.send(IPC.proxyEvent, event)
}
