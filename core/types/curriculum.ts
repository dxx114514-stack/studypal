/**
 * 学段与学科定义（全学科覆盖，K12 → 成人）。
 */
export type StudyStage = 'primary' | 'junior' | 'senior' | 'college' | 'adult'

export interface StageMeta {
  id: StudyStage
  label: string
  description: string
}

export const STUDY_STAGES: StageMeta[] = [
  { id: 'primary', label: '小学', description: '以直观理解与兴趣引导为主，避免抽象术语堆砌' },
  { id: 'junior', label: '初中', description: '重视概念建立与规范步骤，公式推导可适度展开' },
  { id: 'senior', label: '高中', description: '强调体系化与方法迁移，可引入完整推导与题型归纳' },
  { id: 'college', label: '大学', description: '允许专业术语、严谨证明与跨学科联系' },
  { id: 'adult', label: '成人 / 终身学习', description: '以目标导向、效率与实战应用为主，可跳过基础铺垫' }
]

export interface SubjectMeta {
  id: string
  label: string
}

export const SUBJECTS: SubjectMeta[] = [
  { id: 'math', label: '数学' },
  { id: 'chinese', label: '语文' },
  { id: 'english', label: '英语' },
  { id: 'physics', label: '物理' },
  { id: 'chemistry', label: '化学' },
  { id: 'biology', label: '生物' },
  { id: 'history', label: '历史' },
  { id: 'politics', label: '政治' },
  { id: 'geography', label: '地理' },
  { id: 'general', label: '通用学科' }
]

export function stageLabel(stage: StudyStage): string {
  return STUDY_STAGES.find((item) => item.id === stage)?.label ?? '通用'
}

export function subjectLabel(subjectId: string): string {
  return SUBJECTS.find((item) => item.id === subjectId)?.label ?? subjectId
}
