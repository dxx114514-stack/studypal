export type SearchProvider = 'tavily' | 'serper'

export interface SearchResult {
  title: string
  url: string
  snippet: string
}

export interface SearchOptions {
  provider: SearchProvider
  apiKey: string
  maxResults?: number
  signal?: AbortSignal
}
