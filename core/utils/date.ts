/** 本地时区的日期键 YYYY-MM-DD */
export function toDateKey(date = new Date()): string {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** 组装本地时间戳：日期键 + HH:mm；非法输入返回 undefined */
export function combineDateTime(dateKey: string, time: string): number | undefined {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey)
  const timeMatch = /^(\d{1,2}):(\d{2})$/.exec(time)
  if (!dateMatch || !timeMatch) return undefined
  const hours = Number(timeMatch[1])
  const minutes = Number(timeMatch[2])
  if (hours > 23 || minutes > 59) return undefined
  const value = new Date(
    Number(dateMatch[1]),
    Number(dateMatch[2]) - 1,
    Number(dateMatch[3]),
    hours,
    minutes
  ).getTime()
  return Number.isNaN(value) ? undefined : value
}

export function formatClock(timestamp: number): string {
  const date = new Date(timestamp)
  return `${`${date.getHours()}`.padStart(2, '0')}:${`${date.getMinutes()}`.padStart(2, '0')}`
}

export function formatDateLabel(dateKey: string): string {
  const today = toDateKey()
  if (dateKey === today) return '今天'
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  if (dateKey === toDateKey(tomorrow)) return '明天'
  const [, month, day] = dateKey.split('-')
  return `${Number(month)} 月 ${Number(day)} 日`
}
