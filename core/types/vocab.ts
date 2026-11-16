/** 单词测验题型 */
export type QuizMode = 'en-zh' | 'zh-en' | 'zh-input'

/** 本地词库中的一条单词 */
export interface VocabWord {
  id: string
  /** 词库名，导入时由用户指定 */
  book: string
  word: string
  meaning: string
  createdAt: number
  updatedAt: number
}

/** 导入解析得到的原始词条 */
export interface VocabEntry {
  word: string
  meaning: string
}

export interface QuizChoice {
  text: string
  correct: boolean
}

/** 一道测验题 */
export interface QuizQuestion {
  id: string
  mode: QuizMode
  /** 题干：en-zh 为英文，zh-en / zh-input 为中文 */
  prompt: string
  /** 标准答案 */
  answer: string
  /** 选择题选项；zh-input 为空数组 */
  choices: QuizChoice[]
  wordId: string
}

export interface WordBookSummary {
  book: string
  count: number
  updatedAt: number
}

export interface QuizWrongItem {
  prompt: string
  answer: string
  given: string
}

/** 一次已完成测验的成绩记录 */
export interface QuizRecord {
  id: string
  book: string
  mode: QuizMode
  total: number
  correct: number
  wrong: QuizWrongItem[]
  createdAt: number
}
