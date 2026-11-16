import { describe, expect, it } from 'vitest'
import type { VocabWord } from '../../core/types/vocab'
import { normalizeKey, parseWordList } from '../../core/vocab/parse'
import { buildQuiz, gradeTextInput, normalizeAnswer } from '../../core/vocab/quiz'

function seeded(seed = 7): () => number {
  let state = seed
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648
    return state / 2147483648
  }
}

function makeWords(pairs: [string, string][]): VocabWord[] {
  return pairs.map(([word, meaning], index) => ({
    id: `w${index}`,
    book: '测试词库',
    word,
    meaning,
    createdAt: 0,
    updatedAt: 0
  }))
}

describe('parseWordList', () => {
  it('解析逗号分隔并跳过表头', () => {
    const { entries } = parseWordList('word,meaning\nabandon,v. 放弃\nbenefit,n. 益处')
    expect(entries).toEqual([
      { word: 'abandon', meaning: 'v. 放弃' },
      { word: 'benefit', meaning: 'n. 益处' }
    ])
  })

  it('支持制表符分隔', () => {
    const { entries } = parseWordList('abandon\tv. 放弃')
    expect(entries[0]).toEqual({ word: 'abandon', meaning: 'v. 放弃' })
  })

  it('支持两个以上空格分隔', () => {
    const { entries } = parseWordList('abandon    v. 放弃')
    expect(entries[0]).toEqual({ word: 'abandon', meaning: 'v. 放弃' })
  })

  it('剥离序号与中文逗号', () => {
    const { entries } = parseWordList('1. abandon，v. 放弃；抛弃\n2、benefit，n. 益处')
    expect(entries).toHaveLength(2)
    expect(entries[0]).toEqual({ word: 'abandon', meaning: 'v. 放弃；抛弃' })
    expect(entries[1].word).toBe('benefit')
  })

  it('释义里的逗号不会被当成新词条', () => {
    const { entries } = parseWordList('abandon,v. 放弃,抛弃,遗弃')
    expect(entries).toHaveLength(1)
    expect(entries[0].meaning).toBe('v. 放弃,抛弃,遗弃')
  })

  it('同一次导入内按单词去重', () => {
    const { entries, skipped } = parseWordList('abandon,v. 放弃\nAbandon,v. 抛弃')
    expect(entries).toHaveLength(1)
    expect(skipped).toBe(1)
  })

  it('统计无法识别的行', () => {
    const { entries, skipped } = parseWordList('只有单词\nabandon,v. 放弃\n# 注释行')
    expect(entries).toHaveLength(1)
    expect(skipped).toBe(1)
  })

  it('忽略 BOM 与空行', () => {
    const { entries } = parseWordList('\uFEFF\n\nabandon,v. 放弃\n\n')
    expect(entries).toHaveLength(1)
  })

  it('normalizeKey 统一大小写与空白', () => {
    expect(normalizeKey('  Look   Up ')).toBe('look up')
  })
})

describe('buildQuiz', () => {
  const words = makeWords([
    ['abandon', 'v. 放弃'],
    ['benefit', 'n. 益处'],
    ['curious', 'adj. 好奇的'],
    ['determine', 'v. 决定'],
    ['eager', 'adj. 渴望的']
  ])

  it('题量超过词库容量时按容量截断', () => {
    const quiz = buildQuiz(words, { mode: 'en-zh', count: 20, rng: seeded() })
    expect(quiz).toHaveLength(words.length)
    expect(new Set(quiz.map((item) => item.wordId)).size).toBe(words.length)
  })

  it('默认 10 题但不超过词库容量', () => {
    expect(buildQuiz(words, { mode: 'zh-en', rng: seeded() })).toHaveLength(5)
  })

  it('en-zh 给英文、答中文，四选一', () => {
    const quiz = buildQuiz(words, { mode: 'en-zh', count: 5, rng: seeded() })
    for (const question of quiz) {
      const source = words.find((item) => item.id === question.wordId)
      expect(source).toBeDefined()
      expect(question.prompt).toBe(source?.word)
      expect(question.answer).toBe(source?.meaning)
      expect(question.choices).toHaveLength(4)
      expect(question.choices.filter((choice) => choice.correct)).toHaveLength(1)
      expect(new Set(question.choices.map((choice) => choice.text)).size).toBe(4)
    }
  })

  it('zh-en 给中文、答英文', () => {
    const quiz = buildQuiz(words, { mode: 'zh-en', count: 3, rng: seeded() })
    for (const question of quiz) {
      const source = words.find((item) => item.id === question.wordId)
      expect(question.prompt).toBe(source?.meaning)
      expect(question.answer).toBe(source?.word)
      expect(question.choices.some((choice) => choice.text === source?.word && choice.correct)).toBe(true)
    }
  })

  it('zh-input 不给选项', () => {
    const quiz = buildQuiz(words, { mode: 'zh-input', count: 2, rng: seeded() })
    expect(quiz).toHaveLength(2)
    for (const question of quiz) expect(question.choices).toEqual([])
  })

  it('词库不足 4 条时选项数量随之减少', () => {
    const small = makeWords([
      ['abandon', 'v. 放弃'],
      ['benefit', 'n. 益处']
    ])
    const quiz = buildQuiz(small, { mode: 'en-zh', count: 2, rng: seeded() })
    for (const question of quiz) {
      expect(question.choices).toHaveLength(2)
      expect(question.choices.filter((choice) => choice.correct)).toHaveLength(1)
    }
  })

  it('空词库返回空题单', () => {
    expect(buildQuiz([], { mode: 'en-zh' })).toEqual([])
  })

  it('同义项不会被当作干扰项重复出现', () => {
    const duplicated = makeWords([
      ['abandon', 'v. 放弃'],
      ['desert', 'v. 放弃'],
      ['benefit', 'n. 益处'],
      ['curious', 'adj. 好奇的']
    ])
    const quiz = buildQuiz(duplicated, { mode: 'en-zh', count: 4, rng: seeded(3) })
    for (const question of quiz) {
      const texts = question.choices.map((choice) => normalizeAnswer(choice.text))
      expect(new Set(texts).size).toBe(texts.length)
    }
  })
})

describe('gradeTextInput', () => {
  it('忽略大小写与首尾空白', () => {
    expect(gradeTextInput('  Abandon ', 'abandon')).toBe(true)
  })

  it('压缩多余空格', () => {
    expect(gradeTextInput('look    up', 'look up')).toBe(true)
  })

  it('兼容弯引号', () => {
    expect(gradeTextInput('don’t', "don't")).toBe(true)
  })

  it('拼写错误判为错', () => {
    expect(gradeTextInput('abandan', 'abandon')).toBe(false)
  })
})
