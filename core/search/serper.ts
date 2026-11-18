import type { ProviderHttpRequest } from '../ai/transport'
import type { SearchResult } from './types'
import { readArrayField, readStringField } from './shared'

export const SERPER_SEARCH_URL = 'https://google.serper.dev/search'

export function buildSerperRequest(
  query: string,
  apiKey: string,
  maxResults: number
): ProviderHttpRequest {
  return {
    url: SERPER_SEARCH_URL,
    headers: {
      'content-type': 'application/json',
      'X-API-KEY': apiKey
    },
    body: JSON.stringify({ q: query, num: maxResults })
  }
}

export function parseSerperResponse(payload: unknown): SearchResult[] {
  return readArrayField(payload, 'organic')
    .map((item) => ({
      title: readStringField(item, 'title') || '未命名结果',
      url: readStringField(item, 'link'),
      snippet: readStringField(item, 'snippet')
    }))
    .filter((item) => item.url.length > 0)
}
