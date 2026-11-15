import { describe, expect, it } from 'vitest'
import {
  DEFAULT_REVIEW_INTERVALS,
  describeReviewState,
  initialState,
  isDue,
  normalizeIntervals,
  schedule
} from '../../core/srs/algorithm'

const DAY = 86_400_000
const INTERVALS = [1, 3, 7]

describe('normalizeIntervals', () => {
  it('排序、去非法值并取整', () => {
    expect(normalizeIntervals([7, 1, 3])).toEqual([1, 3, 7])
    expect(normalizeIntervals([2.6, 4.2])).toEqual([3, 4])
  })

  it('过滤 0、负数与非数字', () => {
    expect(normalizeIntervals([0, -1, Number.NaN])).toEqual(DEFAULT_REVIEW_INTERVALS)
  })

  it('空输入回退到默认间隔', () => {
    expect(normalizeIntervals([])).toEqual(DEFAULT_REVIEW_INTERVALS)
    expect(normalizeIntervals()).toEqual(DEFAULT_REVIEW_INTERVALS)
  })
})

describe('initialState', () => {
  it('新卡片立即到期、初始难度 2.5', () => {
    const state = initialState(1000)
    expect(state).toMatchObject({
      dueAt: 1000,
      intervalIndex: 0,
      intervalDays: 0,
      ease: 2.5,
      reps: 0,
      lapses: 0
    })
  })
})

describe('schedule', () => {
  it('again 回到第一档并记录遗忘', () => {
    const next = schedule(initialState(0), 'again', INTERVALS, 0)
    expect(next.intervalIndex).toBe(0)
    expect(next.intervalDays).toBe(1)
    expect(next.ease).toBeCloseTo(2.3)
    expect(next.lapses).toBe(1)
    expect(next.reps).toBe(1)
    expect(next.dueAt).toBe(DAY)
  })

  it('good 进入下一档', () => {
    const next = schedule(initialState(0), 'good', INTERVALS, 0)
    expect(next.intervalIndex).toBe(1)
    expect(next.intervalDays).toBe(3)
    expect(next.dueAt).toBe(3 * DAY)
  })

  it('easy 跳两档并按 1.3 倍延长', () => {
    const next = schedule(initialState(0), 'easy', INTERVALS, 0)
    expect(next.intervalIndex).toBe(2)
    expect(next.intervalDays).toBe(9)
    expect(next.ease).toBeCloseTo(2.65)
  })

  it('hard 在当前间隔上打折且不低于 1 天', () => {
    const next = schedule(initialState(0), 'hard', INTERVALS, 0)
    expect(next.intervalIndex).toBe(0)
    expect(next.intervalDays).toBe(1)
    expect(next.ease).toBeCloseTo(2.45)
  })

  it('good 在最后一档时按 ease 继续放大', () => {
    const state = { ...initialState(0), intervalIndex: 2, intervalDays: 7 }
    const next = schedule(state, 'good', INTERVALS, 0)
    expect(next.intervalIndex).toBe(2)
    expect(next.intervalDays).toBe(18)
  })

  it('ease 收敛在 1.3 与 2.8 之间', () => {
    const low = { ...initialState(0), ease: 1.3 }
    expect(schedule(low, 'again', INTERVALS, 0).ease).toBe(1.3)
    const high = { ...initialState(0), ease: 2.8 }
    expect(schedule(high, 'easy', INTERVALS, 0).ease).toBe(2.8)
  })

  it('不修改传入的 state', () => {
    const state = initialState(0)
    const snapshot = { ...state }
    schedule(state, 'good', INTERVALS, 0)
    expect(state).toEqual(snapshot)
  })
})

describe('isDue / describeReviewState', () => {
  it('到期时间等于当前时刻也算到期', () => {
    expect(isDue({ ...initialState(0), dueAt: 100 }, 100)).toBe(true)
    expect(isDue({ ...initialState(0), dueAt: 101 }, 100)).toBe(false)
  })

  it('展示文案区分待复习与剩余天数', () => {
    expect(describeReviewState({ ...initialState(0), dueAt: 0 }, 100)).toBe('待复习')
    expect(describeReviewState({ ...initialState(0), dueAt: 100 + 2.5 * DAY }, 100)).toBe('3 天后复习')
  })
})
