import type { AITransport, ProviderHttpRequest } from '../ai/transport'
import { buildSerperRequest, parseSerperResponse } from './serper'
import { buildTavilyRequest, parseTavilyResponse } from './tavily'
import type { SearchOptions, SearchProvider, SearchResult } from './types'

export type { SearchOptions, SearchProvider, SearchResult } from './types'

const PROVIDER_LABELS: Record<SearchProvider, string> = {
  tavily: 'Tavily',
  serper: 'Serper'
}

const DEFAULT_MAX_RESULTS = 5
const MIN_MAX_RESULTS = 1
const MAX_MAX_RESULTS = 10

/**
 * 联网搜索统一入口：按服务商构建请求，经注入的传输层发送并统一解析、去重、截断。
 * 传输层复用 AITransport，因此 Electron 本地代理等能力无需重复实现。
 */
export async function searchWeb(
  query: string,
  options: SearchOptions,
  transport: AITransport
): Promise<SearchResult[]> {
  const keyword = query.trim()
  if (!keyword) return []

  const maxResults = normalizeMaxResults(options.maxResults)
  const label = PROVIDER_LABELS[options.provider]
  const request = buildRequest(options.provider, keyword, options.apiKey, maxResults)
  const raw = await transport.open(request, { signal: options.signal })

  try {
    const bodyText = await collect(raw.chunks)
    if (!raw.meta.ok) {
      throw new Error(httpFailure(label, raw.meta.status, bodyText))
    }
    const payload = parseBody(label, bodyText)
    const results =
      options.provider === 'tavily' ? parseTavilyResponse(payload) : parseSerperResponse(payload)
    return dedupeByUrl(results).slice(0, maxResults)
  } finally {
    raw.abort()
    raw.dispose()
  }
}

function normalizeMaxResults(value?: number): number {
  if (value === undefined || !Number.isFinite(value)) return DEFAULT_MAX_RESULTS
  return Math.min(MAX_MAX_RESULTS, Math.max(MIN_MAX_RESULTS, Math.floor(value)))
}

function buildRequest(
  provider: SearchProvider,
  query: string,
  apiKey: string,
  maxResults: number
): ProviderHttpRequest {
  return provider === 'tavily'
    ? buildTavilyRequest(query, apiKey, maxResults)
    : buildSerperRequest(query, apiKey, maxResults)
}

async function collect(chunks: AsyncIterable<string>): Promise<string> {
  let text = ''
  for await (const chunk of chunks) text += chunk
  return text
}

function httpFailure(label: string, status: number, bodyText: string): string {
  const snippet = bodyText.replace(/\s+/g, ' ').trim().slice(0, 160)
  const reason =
    status === 401 || status === 403
      ? '请检查 API Key'
      : status === 429
        ? '请求过于频繁或额度不足'
        : '请稍后重试'
  return `${label} 搜索失败（${status}），${reason}${snippet ? `：${snippet}` : ''}`
}

function parseBody(label: string, bodyText: string): unknown {
  try {
    return JSON.parse(bodyText) as unknown
  } catch {
    throw new Error(`${label} 返回内容无法解析，请稍后重试`)
  }
}

function dedupeByUrl(results: SearchResult[]): SearchResult[] {
  const seen = new Set<string>()
  const unique: SearchResult[] = []
  for (const item of results) {
    if (seen.has(item.url)) continue
    seen.add(item.url)
    unique.push(item)
  }
  return unique
}
