import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SETTINGS,
  normalizeSearchSettings,
  searchKeySlot
} from '../../core/types/settings'

describe('normalizeSearchSettings', () => {
  it('缺省时补齐默认值', () => {
    expect(normalizeSearchSettings(undefined)).toEqual({
      provider: 'tavily',
      maxResults: 5
    })
  })

  it('把旧版单 Key 迁移到当时选中的服务商', () => {
    const tavily = normalizeSearchSettings({
      provider: 'tavily',
      maxResults: 5,
      keyPlain: 'tvly-1'
    })
    expect(tavily.tavilyKey).toEqual({ keyPlain: 'tvly-1' })
    expect(tavily.serperKey).toBeUndefined()
    expect(tavily.keyPlain).toBeUndefined()

    const serper = normalizeSearchSettings({
      provider: 'serper',
      maxResults: 3,
      keyCipher: 'cipher-x'
    })
    expect(serper.serperKey).toEqual({ keyCipher: 'cipher-x' })
    expect(serper.tavilyKey).toBeUndefined()
  })

  it('已存在分服务商 Key 时不再迁移旧字段', () => {
    const settings = normalizeSearchSettings({
      provider: 'tavily',
      maxResults: 5,
      tavilyKey: { keyPlain: 'new' },
      keyPlain: 'old'
    })
    expect(settings.tavilyKey).toEqual({ keyPlain: 'new' })
    expect(settings.serperKey).toBeUndefined()
  })

  it('两家 Key 各自保留', () => {
    const settings = normalizeSearchSettings({
      provider: 'serper',
      maxResults: 8,
      tavilyKey: { keyPlain: 'tvly' },
      serperKey: { keyCipher: 'serper-cipher' }
    })
    expect(settings.tavilyKey?.keyPlain).toBe('tvly')
    expect(settings.serperKey?.keyCipher).toBe('serper-cipher')
    expect(settings.maxResults).toBe(8)
  })

  it('不修改传入对象', () => {
    const input = { provider: 'tavily' as const, maxResults: 5, keyPlain: 'k' }
    normalizeSearchSettings(input)
    expect(input.keyPlain).toBe('k')
  })
})

describe('searchKeySlot', () => {
  const settings = {
    provider: 'tavily' as const,
    maxResults: 5,
    tavilyKey: { keyPlain: 't' },
    serperKey: { keyCipher: 's' }
  }

  it('默认取当前服务商', () => {
    expect(searchKeySlot(settings)).toEqual({ keyPlain: 't' })
  })

  it('可显式指定服务商', () => {
    expect(searchKeySlot(settings, 'serper')).toEqual({ keyCipher: 's' })
  })

  it('未配置时返回 undefined', () => {
    expect(searchKeySlot({ ...DEFAULT_SETTINGS.search }, 'serper')).toBeUndefined()
  })
})
