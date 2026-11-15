import { describe, expect, it } from 'vitest'
import { combineDateTime, formatClock, formatDateLabel, toDateKey } from '../../core/utils/date'

describe('toDateKey', () => {
  it('按月与日补零', () => {
    expect(toDateKey(new Date(2026, 0, 5))).toBe('2026-01-05')
    expect(toDateKey(new Date(2026, 10, 15))).toBe('2026-11-15')
  })
})

describe('combineDateTime', () => {
  it('拼出本地时间戳', () => {
    const value = combineDateTime('2026-01-05', '09:07')
    expect(value).toBe(new Date(2026, 0, 5, 9, 7).getTime())
  })

  it('允许一位数小时', () => {
    expect(combineDateTime('2026-01-05', '7:05')).toBe(new Date(2026, 0, 5, 7, 5).getTime())
  })

  it('日期格式非法时返回 undefined', () => {
    expect(combineDateTime('2026/01/05', '09:07')).toBeUndefined()
    expect(combineDateTime('', '09:07')).toBeUndefined()
  })

  it('时间越界时返回 undefined', () => {
    expect(combineDateTime('2026-01-05', '24:00')).toBeUndefined()
    expect(combineDateTime('2026-01-05', '09:60')).toBeUndefined()
    expect(combineDateTime('2026-01-05', '9点')).toBeUndefined()
  })
})

describe('formatClock', () => {
  it('输出 HH:mm', () => {
    expect(formatClock(new Date(2026, 0, 5, 9, 7).getTime())).toBe('09:07')
    expect(formatClock(new Date(2026, 0, 5, 23, 59).getTime())).toBe('23:59')
  })
})

describe('formatDateLabel', () => {
  it('识别今天与明天', () => {
    const today = new Date()
    expect(formatDateLabel(toDateKey(today))).toBe('今天')

    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    expect(formatDateLabel(toDateKey(tomorrow))).toBe('明天')
  })

  it('其它日期显示月日', () => {
    expect(formatDateLabel('2001-03-08')).toBe('3 月 8 日')
  })
})
