import type { FeatureKey } from './provider'
import type { StudyStage } from './curriculum'

export type ThemeMode = 'light' | 'dark' | 'system'

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
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  stage: 'junior',
  subject: 'math',
  defaultProviderId: null,
  featureProviders: {},
  localProxyEnabled: false,
  onboardingDone: false,
  reviewIntervals: [1, 3, 7, 14, 30]
}
