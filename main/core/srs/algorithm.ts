import type { ReviewGrade, ReviewState } from '../types/card'

export const DEFAULT_REVIEW_INTERVALS = [1, 3, 7, 14, 30]

const DAY_MS = 86_400_000
const MIN_EASE = 1.3
const MAX_EASE = 2.8
const START_EASE = 2.5

export function normalizeIntervals(intervals?: number[]): number[] {
  const cleaned = (intervals ?? [])
    .map((value) => Math.round(Number(value)))
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((a, b) => a - b)
  return cleaned.length > 0 ? cleaned : [...DEFAULT_REVIEW_INTERVALS]
}

export function initialState(now = Date.now()): ReviewState {
  return {
    dueAt: now,
    intervalIndex: 0,
    intervalDays: 0,
    ease: START_EASE,
    reps: 0,
    lapses: 0
  }
}

/**
 * 复习调度：以 review_intervals 为主线，叠加 SM-2 的 ease 因子。
 * - again：回到第一档，难度下调
 * - hard：间隔打折，难度略降
 * - good：进入下一档；到最后一档后按 ease 继续放大
 * - easy：跳一档并额外延长，难度上调
 */
export function schedule(
  state: ReviewState,
  grade: ReviewGrade,
  intervals: number[] = DEFAULT_REVIEW_INTERVALS,
  now = Date.now()
): ReviewState {
  const list = normalizeIntervals(intervals)
  const lastIndex = list.length - 1
  const next: ReviewState = { ...state }

  switch (grade) {
    case 'again':
      next.intervalIndex = 0
      next.intervalDays = list[0]
      next.ease = Math.max(MIN_EASE, state.ease - 0.2)
      next.lapses = state.lapses + 1
      break
    case 'hard':
      next.intervalIndex = Math.min(state.intervalIndex, lastIndex)
      next.intervalDays = Math.max(1, Math.round((state.intervalDays || list[0]) * 0.6))
      next.ease = Math.max(MIN_EASE, state.ease - 0.05)
      break
    case 'good': {
      const index = Math.min(state.intervalIndex + 1, lastIndex)
      next.intervalIndex = index
      const atLastStage = state.intervalIndex >= lastIndex
      next.intervalDays = atLastStage
        ? Math.max(list[lastIndex], Math.round((state.intervalDays || list[lastIndex]) * state.ease))
        : list[index]
      break
    }
    case 'easy': {
      const index = Math.min(state.intervalIndex + 2, lastIndex)
      next.intervalIndex = index
      next.intervalDays = Math.max(1, Math.round(list[index] * 1.3))
      next.ease = Math.min(MAX_EASE, state.ease + 0.15)
      break
    }
  }

  next.reps = state.reps + 1
  next.lastReviewedAt = now
  next.dueAt = now + next.intervalDays * DAY_MS
  return next
}

export function isDue(state: ReviewState, now = Date.now()): boolean {
  return state.dueAt <= now
}

/** 用于列表展示的复习状态文案 */
export function describeReviewState(state: ReviewState, now = Date.now()): string {
  if (isDue(state, now)) return '待复习'
  const days = Math.max(1, Math.ceil((state.dueAt - now) / DAY_MS))
  return `${days} 天后复习`
}
