/**
 * 智能复习卡片（单词 / 错题）。
 */
export type CardType = 'word' | 'question'

export type ReviewGrade = 'again' | 'hard' | 'good' | 'easy'

export interface ReviewState {
  /** 下次复习时间（毫秒时间戳） */
  dueAt: number
  /** 当前处于 reviewIntervals 的下标 */
  intervalIndex: number
  /** 当前间隔（天） */
  intervalDays: number
  /** 难度系数，SM-2 简化版 */
  ease: number
  reps: number
  lapses: number
  lastReviewedAt?: number
}

export interface ReviewCard {
  id: string
  type: CardType
  front: string
  back: string
  tags: string[]
  reviewIntervals: number[]
  subject?: string
  source?: 'qa' | 'writing' | 'chat' | 'manual' | 'import'
  state: ReviewState
  createdAt: number
  updatedAt: number
}

/** AI 直接返回的卡片草稿，字段与系统指令 4.4 完全一致 */
export interface AiCardDraft {
  type: CardType
  front: string
  back: string
  tags?: string[]
  review_intervals?: number[]
}

export const CARD_TYPE_LABELS: Record<CardType, string> = {
  word: '单词 / 概念',
  question: '错题 / 题目'
}
