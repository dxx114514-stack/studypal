import type { StorageDriver } from './driver'
import type { TableMap, TableName } from './schema'
import { DexieStorageDriver } from './dexieDriver'
import { MemoryStorageDriver } from './memoryDriver'
import { createRepositories } from './repositories'

class LazyStorageDriver implements StorageDriver {
  private instance: StorageDriver | null = null

  private resolve(): StorageDriver {
    if (!this.instance) {
      const hasIndexedDb = typeof indexedDB !== 'undefined'
      this.instance = hasIndexedDb ? new DexieStorageDriver() : new MemoryStorageDriver()
    }
    return this.instance
  }

  get<T extends TableName>(table: T, id: string): Promise<TableMap[T] | undefined> {
    return this.resolve().get(table, id)
  }

  all<T extends TableName>(table: T): Promise<TableMap[T][]> {
    return this.resolve().all(table)
  }

  put<T extends TableName>(table: T, row: TableMap[T]): Promise<void> {
    return this.resolve().put(table, row)
  }

  bulkPut<T extends TableName>(table: T, rows: TableMap[T][]): Promise<void> {
    return this.resolve().bulkPut(table, rows)
  }

  remove(table: TableName, id: string): Promise<void> {
    return this.resolve().remove(table, id)
  }

  query<T extends TableName>(
    table: T,
    predicate: (row: TableMap[T]) => boolean
  ): Promise<TableMap[T][]> {
    return this.resolve().query(table, predicate)
  }

  clear(table: TableName): Promise<void> {
    return this.resolve().clear(table)
  }

  close(): void {
    this.instance?.close()
  }
}

export const storageDriver: StorageDriver = new LazyStorageDriver()
export const repos = createRepositories(storageDriver)

export * from './schema'
export * from './driver'
export * from './errors'
export * from './backup'
export * from './repositories'
export { DexieStorageDriver } from './dexieDriver'
export { MemoryStorageDriver } from './memoryDriver'
