import { newId } from '../../core/utils/id'
import { normalizeKey } from '../../core/vocab/parse'
import type { QuizRecord, VocabEntry, VocabWord, WordBookSummary } from '../../core/types/vocab'
import type { StorageDriver } from '../driver'

export interface ImportWordsResult {
  added: number
  skipped: number
}

export class WordRepository {
  constructor(private readonly driver: StorageDriver) {}

  async listAll(): Promise<VocabWord[]> {
    const rows = await this.driver.all('words')
    return rows.sort((a, b) => a.book.localeCompare(b.book) || a.word.localeCompare(b.word))
  }

  async listByBook(book: string): Promise<VocabWord[]> {
    const rows = await this.driver.query('words', (item) => item.book === book)
    return rows.sort((a, b) => a.word.localeCompare(b.word))
  }

  async listBooks(): Promise<WordBookSummary[]> {
    const rows = await this.driver.all('words')
    const books = new Map<string, WordBookSummary>()

    for (const row of rows) {
      const current = books.get(row.book)
      if (current) {
        current.count += 1
        current.updatedAt = Math.max(current.updatedAt, row.updatedAt)
      } else {
        books.set(row.book, { book: row.book, count: 1, updatedAt: row.updatedAt })
      }
    }

    return [...books.values()].sort((a, b) => a.book.localeCompare(b.book))
  }

  /** 导入到指定词库，同词库内按单词去重 */
  async importEntries(
    book: string,
    entries: VocabEntry[],
    now = Date.now()
  ): Promise<ImportWordsResult> {
    const name = book.trim()
    if (!name) return { added: 0, skipped: entries.length }
    if (entries.length === 0) return { added: 0, skipped: 0 }

    const existing = await this.driver.query('words', (item) => item.book === name)
    const seen = new Set(existing.map((item) => normalizeKey(item.word)))
    const pending: VocabWord[] = []
    let skipped = 0

    for (const entry of entries) {
      const key = normalizeKey(entry.word)
      if (!key || seen.has(key)) {
        skipped += 1
        continue
      }
      seen.add(key)
      pending.push({
        id: newId('w'),
        book: name,
        word: entry.word.trim(),
        meaning: entry.meaning.trim(),
        createdAt: now,
        updatedAt: now
      })
    }

    await this.driver.bulkPut('words', pending)
    return { added: pending.length, skipped }
  }

  async removeBook(book: string): Promise<number> {
    const rows = await this.driver.query('words', (item) => item.book === book)
    for (const row of rows) await this.driver.remove('words', row.id)
    return rows.length
  }

  async remove(id: string): Promise<void> {
    await this.driver.remove('words', id)
  }

  async saveResult(record: QuizRecord): Promise<QuizRecord> {
    await this.driver.put('quizRecords', record)
    return record
  }

  async listResults(limit = 20): Promise<QuizRecord[]> {
    const rows = await this.driver.all('quizRecords')
    return rows.sort((a, b) => b.createdAt - a.createdAt).slice(0, limit)
  }

  async clearResults(): Promise<void> {
    await this.driver.clear('quizRecords')
  }
}
