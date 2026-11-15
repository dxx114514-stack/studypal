import type { AiCardDraft, CardType, ReviewCard, ReviewGrade } from '../../core/types/card'
import { DEFAULT_REVIEW_INTERVALS, schedule } from '../../core/srs/algorithm'
import { createCardFromDraft, type CreateCardOptions } from '../../core/cards/factory'
import type { StorageDriver } from '../driver'
import type { StoredCard } from '../schema'

export class CardRepository {
  constructor(private readonly driver: StorageDriver) {}

  async listAll(): Promise<StoredCard[]> {
    const rows = await this.driver.all('cards')
    return rows.sort((a, b) => b.createdAt - a.createdAt)
  }

  async listByType(type: CardType): Promise<StoredCard[]> {
    const rows = await this.driver.query('cards', (card) => card.type === type)
    return rows.sort((a, b) => b.createdAt - a.createdAt)
  }

  async listDue(now = Date.now()): Promise<StoredCard[]> {
    const rows = await this.driver.query('cards', (card) => card.dueAt <= now)
    return rows.sort((a, b) => a.dueAt - b.dueAt)
  }

  async countDue(now = Date.now()): Promise<number> {
    return (await this.listDue(now)).length
  }

  async save(card: ReviewCard): Promise<StoredCard> {
    const stored: StoredCard = { ...card, dueAt: card.state.dueAt }
    await this.driver.put('cards', stored)
    return stored
  }

  async review(
    cardId: string,
    grade: ReviewGrade,
    intervals: number[] = DEFAULT_REVIEW_INTERVALS,
    now = Date.now()
  ): Promise<StoredCard | null> {
    const card = await this.driver.get('cards', cardId)
    if (!card) return null
    const next: StoredCard = {
      ...card,
      reviewIntervals: intervals,
      state: schedule(card.state, grade, intervals, now),
      updatedAt: now
    }
    return this.save(next)
  }

  async remove(id: string): Promise<void> {
    await this.driver.remove('cards', id)
  }

  async importDrafts(
    drafts: AiCardDraft[],
    options: CreateCardOptions = {}
  ): Promise<StoredCard[]> {
    if (drafts.length === 0) return []
    const existing = await this.driver.all('cards')
    const seen = new Set(existing.map((card) => normalizeFront(card.front)))
    const created: StoredCard[] = []

    for (const draft of drafts) {
      const key = normalizeFront(draft.front)
      if (!key || seen.has(key)) continue
      seen.add(key)
      const card = createCardFromDraft(draft, options)
      created.push(await this.save(card))
    }

    return created
  }
}

function normalizeFront(front: string): string {
  return front.replace(/\s+/g, ' ').trim().toLowerCase()
}
