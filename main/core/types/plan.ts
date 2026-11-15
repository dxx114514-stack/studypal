/**
 * 学习计划（本地存储，可选提醒）。
 */
export interface StudyPlan {
  id: string
  /** 计划日期，格式 YYYY-MM-DD（本地时区） */
  date: string
  title: string
  subject: string
  note?: string
  done: boolean
  /** 提醒时间戳，未设置则为空 */
  reminderAt?: number
  /** 已发送提醒的时间，避免重复通知 */
  notifiedAt?: number
  createdAt: number
  updatedAt: number
}
