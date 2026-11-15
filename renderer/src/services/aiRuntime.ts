import { AIClient } from '@core/ai/client'
import { AIError } from '@core/ai/errors'
import { createFetchTransport } from '@core/ai/transport'
import type { AIMessage, AIRequest, ImageInput } from '@core/types/chat'
import type { FeatureKey, ProviderConfig } from '@core/types/provider'
import { repos } from '@storage/index'
import { getPlatform } from './platform'
import { createProxyTransport } from './electronTransport'
import { readProviderApiKey } from './secretStore'

export interface FeatureRunOptions {
  systemPrompt: string
  messages: AIMessage[]
  imageBytes?: ImageInput[]
  signal?: AbortSignal
  onDelta?: (text: string) => void
}

/** 按「功能路由 → 全局默认」解析出当前应使用的提供商 */
export async function resolveProvider(feature: FeatureKey): Promise<ProviderConfig> {
  const settings = await repos.settings.load()
  const providerId = settings.featureProviders[feature] ?? settings.defaultProviderId
  if (!providerId) {
    throw new AIError('PROVIDER_ERROR', { message: '请先在设置中添加并选择一个 AI 提供商' })
  }
  const provider = await repos.providers.get(providerId)
  if (!provider) {
    throw new AIError('PROVIDER_ERROR', { message: '所选提供商已被删除，请重新选择' })
  }
  return provider
}

/** 所有 AI 功能的统一入口：始终流式，逐字回调 */
export async function runFeature(feature: FeatureKey, options: FeatureRunOptions): Promise<string> {
  const provider = await resolveProvider(feature)
  const apiKey = await readProviderApiKey(provider.id)
  if (!apiKey) {
    throw new AIError('INVALID_API_KEY', { message: `“${provider.name}”尚未配置 API Key` })
  }

  const settings = await repos.settings.load()
  const platform = await getPlatform()
  const useProxy = provider.useLocalProxy && settings.localProxyEnabled && platform.proxy
  const transport = useProxy && platform.proxy ? createProxyTransport(platform.proxy) : createFetchTransport()

  const request: AIRequest = {
    apiKey,
    modelType: provider.modelType,
    customBaseUrl: provider.baseUrl,
    protocol: provider.protocol,
    messages: options.messages,
    systemPrompt: options.systemPrompt,
    imageBytes: options.imageBytes,
    stream: true,
    supportsVision: provider.supportsVision,
    supportsStream: provider.supportsStream,
    signal: options.signal
  }

  const client = new AIClient(transport)
  return client.stream(request, { onDelta: options.onDelta })
}

export interface ConnectionTestResult {
  ms: number
  sample: string
}

/** 连接测试：发送一次极短的非流式请求，验证 Key / Base URL / 模型是否可用 */
export async function testProviderConnection(
  provider: ProviderConfig,
  apiKeyInput?: string
): Promise<ConnectionTestResult> {
  const apiKey = apiKeyInput?.trim() || (await readProviderApiKey(provider.id))
  if (!apiKey) {
    throw new AIError('INVALID_API_KEY', { message: '请先填写 API Key 再测试' })
  }

  const settings = await repos.settings.load()
  const platform = await getPlatform()
  const proxy = provider.useLocalProxy && settings.localProxyEnabled ? platform.proxy : undefined
  const client = new AIClient(proxy ? createProxyTransport(proxy) : createFetchTransport())
  const startedAt = Date.now()

  const text = await client.stream({
    apiKey,
    modelType: provider.modelType,
    customBaseUrl: provider.baseUrl,
    protocol: provider.protocol,
    messages: [{ role: 'user', content: '请只回复四个字：连接成功' }],
    systemPrompt: '你是连接测试助手，只回复“连接成功”，不要输出其他内容。',
    stream: false,
    supportsStream: false,
    timeoutMs: 20_000
  })

  return { ms: Date.now() - startedAt, sample: text.trim().slice(0, 60) }
}
