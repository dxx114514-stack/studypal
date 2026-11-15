import type { ProviderProtocol } from '../../types/provider'
import type { ProviderAdapter } from './types'
import { openAIAdapter } from './openai'
import { anthropicAdapter } from './anthropic'
import { geminiAdapter } from './gemini'

export * from './types'

const ADAPTERS: Record<ProviderProtocol, ProviderAdapter> = {
  openai: openAIAdapter,
  anthropic: anthropicAdapter,
  gemini: geminiAdapter
}

export function getAdapter(protocol: ProviderProtocol): ProviderAdapter {
  return ADAPTERS[protocol] ?? openAIAdapter
}

export { openAIAdapter, anthropicAdapter, geminiAdapter }
