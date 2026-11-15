/**
 * 示例：复习调度模拟
 * 运行：npm run example:srs
 */
import type { ReviewGrade } from '../core/types/card'
import { describeReviewState, initialState, schedule } from '../core/srs/algorithm'

const INTERVALS = [1, 3, 7, 14, 30]
const GRADES: ReviewGrade[] = ['good', 'good', 'hard', 'good', 'again', 'good', 'easy']

let now = new Date('2026-01-01T08:00:00+08:00').getTime()
let state = initialState(now)

console.log('初始：', describeReviewState(state, now))

GRADES.forEach((grade, index) => {
  state = schedule(state, grade, INTERVALS, now)
  now = state.dueAt
  console.log(
    `第 ${index + 1} 次评价「${grade}」→ 间隔 ${state.intervalDays} 天，` +
      `ease ${state.ease.toFixed(2)}，到期 ${new Date(state.dueAt).toISOString().slice(0, 10)}`
  )
})
