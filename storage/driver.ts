import type { TableMap, TableName } from './schema'

/**
 * 本地存储驱动接口。
 * 桌面端默认 IndexedDB（可替换为 SQLite/OPFS），移动端可替换为 SQLite/Hive，
 * 上层仓储与 UI 不感知具体实现。
 */
export interface StorageDriver {
  get<T extends TableName>(table: T, id: string): Promise<TableMap[T] | undefined>
  all<T extends TableName>(table: T): Promise<TableMap[T][]>
  put<T extends TableName>(table: T, row: TableMap[T]): Promise<void>
  bulkPut<T extends TableName>(table: T, rows: TableMap[T][]): Promise<void>
  remove(table: TableName, id: string): Promise<void>
  query<T extends TableName>(table: T, predicate: (row: TableMap[T]) => boolean): Promise<TableMap[T][]>
  clear(table: TableName): Promise<void>
  close(): void
}
