import type { FeatureKey } from './provider'
import type { StudyStage } from './curriculum'
import type { SearchProvider } from '../search/types'

export type ThemeMode = 'light' | 'dark' | 'system'

export interface SearchProviderKey {
  /** Electron 系统安全存储加密后的密文 */
  keyCipher?: string
  /** 无安全存储能力时的明文兜底（仅存本机，绝不上传） */
  keyPlain?: string
}

export interface SearchSettings {
  provider: SearchProvider
  maxResults: number
  /** Tavily 的 Key，与 Serper 独立保存 */
  tavilyKey?: SearchProviderKey
  /** Serper 的 Key，与 Tavily 独立保存 */
  serperKey?: SearchProviderKey
  /** 旧版单 Key 字段，仅用于读取时迁移 */
  keyCipher?: string
  keyPlain?: string
}

export interface AppSettings {
  theme: ThemeMode
  stage: StudyStage
  subject: string
  defaultProviderId: string | null
  /** 为不同功能指定专用提供商（拍照答疑用多模态、写作批改用润色强的模型） */
  featureProviders: Partial<Record<FeatureKey, string>>
  /** 是否允许经由 Electron 主进程转发请求（默认关闭，仅用户手动开启） */
  localProxyEnabled: boolean
  onboardingDone: boolean
  /** 复习间隔（天），可在设置中调整 */
  reviewIntervals: number[]
  /** 联网搜索配置（对话页手动开关时使用） */
  search: SearchSettings
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  stage: 'junior',
  subject: 'math',
  defaultProviderId: null,
  featureProviders: {},
  localProxyEnabled: false,
  onboardingDone: false,
  reviewIntervals: [1, 3, 7, 14, 30],
  search: { provider: 'tavily', maxResults: 5 }
}

/** 取指定服务商的 Key 槽位 */
export function searchKeySlot(
  settings: SearchSettings,
  provider: SearchProvider = settings.provider
): SearchProviderKey | undefined {
  return provider === 'tavily' ? settings.tavilyKey : settings.serperKey
}

/** 补齐默认值，并把旧版单 Key 结构迁移到当时选中的服务商槽位 */
export function normalizeSearchSettings(input?: Partial<SearchSettings>): SearchSettings {
  const merged: SearchSettings = { ...DEFAULT_SETTINGS.search, ...(input ?? {}) }

  if ((merged.keyCipher || merged.keyPlain) && !merged.tavilyKey && !merged.serperKey) {
    const migrated: SearchProviderKey = { keyCipher: merged.keyCipher, keyPlain: merged.keyPlain }
    if (merged.provider === 'serper') merged.serperKey = migrated
    else merged.tavilyKey = migrated
  }

  const cleaned: SearchSettings = { ...merged }
  delete cleaned.keyCipher
  delete cleaned.keyPlain
  return cleaned
}
