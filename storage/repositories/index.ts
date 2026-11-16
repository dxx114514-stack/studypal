import type { StorageDriver } from '../driver'
import { SettingsRepository } from './settings'
import { ProviderRepository } from './providers'
import { CardRepository } from './cards'
import { NoteRepository } from './notes'
import { ConversationRepository } from './conversations'
import { PlanRepository } from './plans'
import { WordRepository } from './words'

export function createRepositories(driver: StorageDriver) {
  return {
    settings: new SettingsRepository(driver),
    providers: new ProviderRepository(driver),
    cards: new CardRepository(driver),
    notes: new NoteRepository(driver),
    conversations: new ConversationRepository(driver),
    plans: new PlanRepository(driver),
    words: new WordRepository(driver)
  }
}

export type Repositories = ReturnType<typeof createRepositories>

export {
  SettingsRepository,
  ProviderRepository,
  CardRepository,
  NoteRepository,
  ConversationRepository,
  PlanRepository,
  WordRepository
}
