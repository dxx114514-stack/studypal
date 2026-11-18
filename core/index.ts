/**
 * dxx's StudyPal 跨端核心层公共出口。
 * 该目录不得引入 DOM / Node / Electron / Capacitor 任何平台 API。
 */
export * from './types'
export * from './ai/client'
export * from './ai/errors'
export * from './ai/sse'
export * from './ai/transport'
export * from './ai/adapters'
export * from './ai/providerRegistry'
export * from './prompts'
export * from './search'
export * from './srs'
export * from './cards/factory'
export * from './markdown-tree'
export * from './utils/id'
export * from './utils/json'
export * from './utils/date'
export * from './utils/asyncChannel'
