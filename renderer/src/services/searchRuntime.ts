import { createFetchTransport } from '@core/ai/transport'
import { searchWeb } from '@core/search'
import type { SearchResult } from '@core/search/types'
import { repos } from '@storage/index'
import { createProxyTransport } from './electronTransport'
import { getPlatform } from './platform'

export interface RunSearchOptions {
  signal?: AbortSignal
}

/**
 * 联网搜索 Key 的保存策略与 AI Key 一致：
 * 优先系统安全存储加密，不可用时降级为本机明文。
 */
export async function saveSearchKey(apiKey: string): Promise<void> {
  const trimmed = apiKey.trim()
  const current = await repos.settings.load()

  if (!trimmed) {
    await repos.settings.save({
      search: { ...current.search, keyCipher: undefined, keyPlain: undefined }
    })
    return
  }

  const platform = await getPlatform()
  try {
    if (await platform.secure.isAvailable()) {
      const keyCipher = await platform.secure.encrypt(trimmed)
      await repos.settings.save({ search: { ...current.search, keyCipher, keyPlain: undefined } })
      return
    }
  } catch (error) {
    console.warn('[StudyPal] 系统安全存储不可用，搜索 Key 降级为本地明文保存', error)
  }

  await repos.settings.save({ search: { ...current.search, keyPlain: trimmed, keyCipher: undefined } })
}

export async function readSearchKey(): Promise<string> {
  const settings = await repos.settings.load()
  if (settings.search.keyCipher) {
    const platform = await getPlatform()
    try {
      return await platform.secure.decrypt(settings.search.keyCipher)
    } catch {
      return ''
    }
  }
  return settings.search.keyPlain ?? ''
}

/** 按设置中的服务商与本地代理开关执行一次联网搜索 */
export async function runSearch(
  query: string,
  options: RunSearchOptions = {}
): Promise<SearchResult[]> {
  const settings = await repos.settings.load()
  const apiKey = await readSearchKey()
  if (!apiKey) {
    throw new Error('请先在设置页填写联网搜索的 API Key')
  }

  const platform = await getPlatform()
  const proxy = settings.localProxyEnabled ? platform.proxy : undefined
  const transport = proxy ? createProxyTransport(proxy) : createFetchTransport()

  return searchWeb(
    query,
    {
      provider: settings.search.provider,
      apiKey,
      maxResults: settings.search.maxResults,
      signal: options.signal
    },
    transport
  )
}
