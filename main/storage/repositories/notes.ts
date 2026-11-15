import type { StorageDriver } from '../driver'
import type { StoredNote } from '../schema'

export class NoteRepository {
  constructor(private readonly driver: StorageDriver) {}

  async list(kind?: StoredNote['kind']): Promise<StoredNote[]> {
    const rows = kind
      ? await this.driver.query('notes', (note) => note.kind === kind)
      : await this.driver.all('notes')
    return rows.sort((a, b) => b.updatedAt - a.updatedAt)
  }

  async get(id: string): Promise<StoredNote | undefined> {
    return this.driver.get('notes', id)
  }

  async save(note: StoredNote): Promise<StoredNote> {
    await this.driver.put('notes', note)
    return note
  }

  async remove(id: string): Promise<void> {
    await this.driver.remove('notes', id)
  }
}
