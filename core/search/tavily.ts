import type { ProviderHttpRequest } from '../ai/transport'
import type { SearchResult } from './types'
import { readArrayField, readStringField } from './shared'

export const TAVILY_SEARCH_URL = 'https://api.tavily.com/search'

export function buildTavilyRequest(
  query: string,
  apiKey: string,
  maxResults: number
): ProviderHttpRequest {
  return {
    url: TAVILY_SEARCH_URL,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      max_results: maxResults,
      search_depth: 'basic',
      include_answer: false
    })
  }
}

export function parseTavilyResponse(payload: unknown): SearchResult[] {
  return readArrayField(payload, 'results')
    .map((item) => ({
      title: readStringField(item, 'title') || '未命名结果',
      url: readStringField(item, 'url'),
      snippet: readStringField(item, 'content')
    }))
    .filter((item) => item.url.length > 0)
}
