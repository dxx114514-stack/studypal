import type { AiCardDraft, ReviewCard } from '../types/card'
import { newId } from '../utils/id'
import { initialState, normalizeIntervals } from '../srs/algorithm'

export interface CreateCardOptions {
  intervals?: number[]
  subject?: string
  source?: ReviewCard['source']
  now?: number
}

export function createCardFromDraft(draft: AiCardDraft, options: CreateCardOptions = {}): ReviewCard {
  const now = options.now ?? Date.now()
  const intervals = normalizeIntervals(draft.review_intervals ?? options.intervals)
  return {
    id: newId('card'),
    type: draft.type === 'word' ? 'word' : 'question',
    front: draft.front.trim(),
    back: draft.back.trim(),
    tags: normalizeTags(draft.tags),
    reviewIntervals: intervals,
    subject: options.subject,
    source: options.source ?? 'manual',
    state: initialState(now),
    createdAt: now,
    updatedAt: now
  }
}

export function normalizeTags(tags?: string[]): string[] {
  if (!Array.isArray(tags)) return []
  const unique = new Set<string>()
  tags.forEach((tag) => {
    const value = String(tag).trim().replace(/^#/, '')
    if (value) unique.add(value)
  })
  return [...unique].slice(0, 8)
}

/** 容错解析模型返回的卡片 JSON（数组或 { cards: [...] }） */
export function normalizeDrafts(raw: unknown): AiCardDraft[] {
  const list = Array.isArray(raw)
    ? raw
    : raw && typeof raw === 'object' && Array.isArray((raw as { cards?: unknown }).cards)
      ? ((raw as { cards: unknown[] }).cards)
      : []

  const drafts: AiCardDraft[] = []
  list.forEach((item) => {
    if (!item || typeof item !== 'object') return
    const record = item as Record<string, unknown>
    const front = typeof record.front === 'string' ? record.front.trim() : ''
    const back = typeof record.back === 'string' ? record.back.trim() : ''
    if (!front || !back) return
    const type = record.type === 'word' ? 'word' : 'question'
    drafts.push({
      type,
      front,
      back,
      tags: Array.isArray(record.tags) ? (record.tags as string[]) : [],
      review_intervals: Array.isArray(record.review_intervals)
        ? (record.review_intervals as number[])
        : undefined
    })
  })
  return drafts
}
