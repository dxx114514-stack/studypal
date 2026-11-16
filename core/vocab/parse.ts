import type { VocabEntry } from '../types/vocab'

const HEADER_WORDS = new Set(['word', 'words', 'english', 'spelling', '单词', '英文', '词汇', '生词'])
const HEADER_MEANINGS = new Set([
  'meaning',
  'meanings',
  'translation',
  'chinese',
  '中文',
  '释义',
  '翻译',
  '词义',
  '解释',
  '意思'
])

const DELIMITERS = ['\t', ',', '，', ';', '；', '|']

export interface ParseWordListResult {
  entries: VocabEntry[]
  /** 无法识别的行数（不含空行） */
  skipped: number
}

/**
 * 解析用户导入的词库文本。
 * 支持 `单词,释义`、`单词<TAB>释义`、`单词  释义` 以及带序号的清单，
 * 每行一条，按首个分隔符切分，剩余部分全部归入释义。
 */
export function parseWordList(text: string): ParseWordListResult {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/)
  const entries: VocabEntry[] = []
  const seen = new Set<string>()
  let skipped = 0

  for (const rawLine of lines) {
    const line = stripNumbering(rawLine.trim())
    if (!line || line.startsWith('#')) continue

    const parts = splitLine(line)
    if (!parts) {
      skipped += 1
      continue
    }

    const word = cleanToken(parts[0])
    const meaning = cleanToken(parts[1])
    if (!word || !meaning) {
      skipped += 1
      continue
    }
    if (isHeader(word, meaning)) continue

    const key = normalizeKey(word)
    if (seen.has(key)) {
      skipped += 1
      continue
    }
    seen.add(key)
    entries.push({ word, meaning })
  }

  return { entries, skipped }
}

function splitLine(line: string): [string, string] | null {
  for (const delimiter of DELIMITERS) {
    const index = line.indexOf(delimiter)
    if (index > 0) return [line.slice(0, index), line.slice(index + delimiter.length)]
  }

  const spaced = line.match(/^(\S+)\s+(.+)$/)
  if (spaced) return [spaced[1], spaced[2]]
  return null
}

function stripNumbering(line: string): string {
  return line.replace(/^\s*(?:\d+\s*[.、)）-]|[-*•])\s*/, '').trim()
}

function cleanToken(token: string): string {
  return token
    .trim()
    .replace(/^["'“”‘’`]+|["'“”‘’`]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function isHeader(word: string, meaning: string): boolean {
  return HEADER_WORDS.has(word.toLowerCase()) || HEADER_MEANINGS.has(meaning.toLowerCase())
}

export function normalizeKey(word: string): string {
  return word.replace(/\s+/g, ' ').trim().toLowerCase()
}
