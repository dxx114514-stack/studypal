import type { StorageDriver } from './driver'
import type { TableMap, TableName } from './schema'

/** 内存驱动：测试、隐私模式或 IndexedDB 不可用时的兜底 */
export class MemoryStorageDriver implements StorageDriver {
  private readonly tables = new Map<TableName, Map<string, unknown>>()

  private table<T extends TableName>(name: T): Map<string, TableMap[T]> {
    let store = this.tables.get(name)
    if (!store) {
      store = new Map()
      this.tables.set(name, store)
    }
    return store as Map<string, TableMap[T]>
  }

  async get<T extends TableName>(table: T, id: string): Promise<TableMap[T] | undefined> {
    return this.table(table).get(id)
  }

  async all<T extends TableName>(table: T): Promise<TableMap[T][]> {
    return [...this.table(table).values()]
  }

  async put<T extends TableName>(table: T, row: TableMap[T]): Promise<void> {
    this.table(table).set(readId(row), row)
  }

  async bulkPut<T extends TableName>(table: T, rows: TableMap[T][]): Promise<void> {
    rows.forEach((row) => this.table(table).set(readId(row), row))
  }

  async remove(table: TableName, id: string): Promise<void> {
    this.table(table).delete(id)
  }

  async query<T extends TableName>(
    table: T,
    predicate: (row: TableMap[T]) => boolean
  ): Promise<TableMap[T][]> {
    return (await this.all(table)).filter(predicate)
  }

  async clear(table: TableName): Promise<void> {
    this.table(table).clear()
  }

  close(): void {
    this.tables.clear()
  }
}

function readId(row: unknown): string {
  const record = row as { id?: string; key?: string }
  return record.id ?? record.key ?? ''
}
