import type { QuizChoice, QuizMode, QuizQuestion, VocabWord } from '../types/vocab'

export const DEFAULT_QUIZ_COUNT = 10
export const CHOICE_COUNT = 4

export interface BuildQuizOptions {
  mode: QuizMode
  /** 题目数量，超过词库容量时按容量截断 */
  count?: number
  rng?: () => number
}

/**
 * 从词库随机抽题。
 * - en-zh：给英文选中文释义
 * - zh-en：给中文释义选英文
 * - zh-input：给中文释义手输英文
 */
export function buildQuiz(words: VocabWord[], options: BuildQuizOptions): QuizQuestion[] {
  const { mode, count = DEFAULT_QUIZ_COUNT, rng = Math.random } = options
  const pool = words.filter((item) => item.word.trim() && item.meaning.trim())
  if (pool.length === 0) return []

  const total = Math.max(1, Math.min(Math.floor(count), pool.length))
  const picked = shuffle(pool, rng).slice(0, total)

  return picked.map((entry, index) => {
    const base = {
      id: `q_${index}`,
      mode,
      prompt: mode === 'en-zh' ? entry.word : entry.meaning,
      answer: mode === 'en-zh' ? entry.meaning : entry.word,
      wordId: entry.id
    }

    if (mode === 'zh-input') return { ...base, choices: [] }

    const field = mode === 'en-zh' ? 'meaning' : 'word'
    const others = pool.filter((item) => item.id !== entry.id)
    const distractors = collectDistractors(others, field, base.answer, CHOICE_COUNT - 1, rng)
    const choices: QuizChoice[] = [
      { text: base.answer, correct: true },
      ...distractors.map((text) => ({ text, correct: false }))
    ]

    return { ...base, choices: shuffle(choices, rng) }
  })
}

/** 手输题判分：忽略大小写、首尾空白与多余空格 */
export function gradeTextInput(input: string, answer: string): boolean {
  return normalizeAnswer(input) === normalizeAnswer(answer)
}

export function normalizeAnswer(value: string): string {
  return value.replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim().toLowerCase()
}

function collectDistractors(
  others: VocabWord[],
  field: 'word' | 'meaning',
  answer: string,
  limit: number,
  rng: () => number
): string[] {
  const seen = new Set([normalizeAnswer(answer)])
  const picked: string[] = []

  for (const item of shuffle(others, rng)) {
    const text = item[field]
    const key = normalizeAnswer(text)
    if (!key || seen.has(key)) continue
    seen.add(key)
    picked.push(text)
    if (picked.length >= limit) break
  }

  return picked
}

function shuffle<T>(items: readonly T[], rng: () => number): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1))
    const tmp = copy[i]
    copy[i] = copy[j]
    copy[j] = tmp
  }
  return copy
}
