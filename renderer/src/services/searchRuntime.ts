import { createFetchTransport } from '@core/ai/transport'
import { searchWeb } from '@core/search'
import type { SearchProvider, SearchResult } from '@core/search/types'
import { searchKeySlot, type SearchProviderKey } from '@core/types/settings'
import { repos } from '@storage/index'
import { createProxyTransport } from './electronTransport'
import { getPlatform } from './platform'

export interface RunSearchOptions {
  signal?: AbortSignal
}

const PROVIDER_LABELS: Record<SearchProvider, string> = {
  tavily: 'Tavily',
  serper: 'Serper'
}

/**
 * 联网搜索 Key 的保存策略与 AI Key 一致：
 * 优先系统安全存储加密，不可用时降级为本机明文；Tavily 与 Serper 分开保存。
 */
export async function saveSearchKey(provider: SearchProvider, apiKey: string): Promise<void> {
  const trimmed = apiKey.trim()
  if (!trimmed) {
    await writeSearchKey(provider, undefined)
    return
  }

  const platform = await getPlatform()
  try {
    if (await platform.secure.isAvailable()) {
      const keyCipher = await platform.secure.encrypt(trimmed)
      await writeSearchKey(provider, { keyCipher })
      return
    }
  } catch (error) {
    console.warn('[StudyPal] 系统安全存储不可用，搜索 Key 降级为本地明文保存', error)
  }

  await writeSearchKey(provider, { keyPlain: trimmed })
}

export async function readSearchKey(provider?: SearchProvider): Promise<string> {
  const settings = await repos.settings.load()
  const target = provider ?? settings.search.provider
  const slot = searchKeySlot(settings.search, target)
  if (!slot) return ''

  if (slot.keyCipher) {
    const platform = await getPlatform()
    try {
      return await platform.secure.decrypt(slot.keyCipher)
    } catch {
      return ''
    }
  }
  return slot.keyPlain ?? ''
}

export async function hasSearchKey(provider?: SearchProvider): Promise<boolean> {
  return (await readSearchKey(provider)).length > 0
}

export function searchProviderLabel(provider: SearchProvider): string {
  return PROVIDER_LABELS[provider]
}

/** 按设置中的服务商与本地代理开关执行一次联网搜索 */
export async function runSearch(
  query: string,
  options: RunSearchOptions = {}
): Promise<SearchResult[]> {
  const settings = await repos.settings.load()
  const provider = settings.search.provider
  const apiKey = await readSearchKey(provider)
  if (!apiKey) {
    throw new Error(`请先在设置页填写 ${PROVIDER_LABELS[provider]} 的 API Key`)
  }

  const platform = await getPlatform()
  const proxy = settings.localProxyEnabled ? platform.proxy : undefined
  const transport = proxy ? createProxyTransport(proxy) : createFetchTransport()

  return searchWeb(
    query,
    {
      provider,
      apiKey,
      maxResults: settings.search.maxResults,
      signal: options.signal
    },
    transport
  )
}

async function writeSearchKey(provider: SearchProvider, slot?: SearchProviderKey): Promise<void> {
  const current = await repos.settings.load()
  const search = { ...current.search }
  if (provider === 'tavily') search.tavilyKey = slot
  else search.serperKey = slot
  await repos.settings.save({ search })
}
