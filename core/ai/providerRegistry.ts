import type { ProviderConfig, ProviderPreset } from '../types/provider'

/**
 * 常见提供商预设。仅用于「一键填充」，用户可任意修改 Base URL 与模型名，
 * 也支持 Ollama / LocalAI / vLLM 等本地或自建 OpenAI 兼容服务。
 */
export const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    protocol: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    modelType: 'gpt-4o-mini',
    supportsVision: true,
    supportsStream: true,
    notes: '支持图片输入与流式输出'
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    protocol: 'gemini',
    baseUrl: 'https://generativelanguage.googleapis.com',
    modelType: 'gemini-2.0-flash',
    supportsVision: true,
    supportsStream: true,
    notes: '免费额度较友好，适合拍照答疑'
  },
  {
    id: 'qwen',
    name: '通义千问 Qwen（兼容模式）',
    protocol: 'openai',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    modelType: 'qwen-vl-max',
    supportsVision: true,
    supportsStream: true,
    notes: '使用 OpenAI 兼容模式，中文表现好'
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    protocol: 'openai',
    baseUrl: 'https://api.deepseek.com/v1',
    modelType: 'deepseek-chat',
    supportsVision: false,
    supportsStream: true,
    notes: '纯文本模型，适合写作批改与对话'
  },
  {
    id: 'claude',
    name: 'Anthropic Claude',
    protocol: 'anthropic',
    baseUrl: 'https://api.anthropic.com',
    modelType: 'claude-3-5-sonnet-20241022',
    supportsVision: true,
    supportsStream: true,
    notes: '长文本与写作批改表现好'
  },
  {
    id: 'ollama',
    name: 'Ollama（本地）',
    protocol: 'openai',
    baseUrl: 'http://localhost:11434/v1',
    modelType: 'qwen2.5:7b',
    supportsVision: false,
    supportsStream: true,
    notes: '本地推理，需先 ollama serve；桌面端建议开启本地代理'
  },
  {
    id: 'localai',
    name: 'LocalAI / vLLM（本地）',
    protocol: 'openai',
    baseUrl: 'http://localhost:8080/v1',
    modelType: 'local-model',
    supportsVision: false,
    supportsStream: true,
    notes: '任意 OpenAI 兼容本地服务'
  }
]

export function createProviderFromPreset(preset: ProviderPreset, now = Date.now()): ProviderConfig {
  return {
    id: `provider_${preset.id}_${now.toString(36)}`,
    name: preset.name,
    protocol: preset.protocol,
    baseUrl: preset.baseUrl,
    modelType: preset.modelType,
    supportsVision: preset.supportsVision,
    supportsStream: preset.supportsStream,
    useLocalProxy: false,
    notes: preset.notes,
    createdAt: now,
    updatedAt: now
  }
}
