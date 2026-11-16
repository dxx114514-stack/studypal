import Dexie from 'dexie'
import type { StorageDriver } from './driver'
import { DB_NAME, LEGACY_TABLE_SCHEMAS_V1, LEGACY_TABLE_SCHEMAS_V2, LEGACY_TABLE_SCHEMAS_V3, SCHEMA_VERSION, TABLE_SCHEMAS, type TableMap, type TableName } from './schema'
import { wrapStorageError } from './errors'

class StudyPalDatabase extends Dexie {
  constructor() {
    super(DB_NAME)
    this.version(1).stores(LEGACY_TABLE_SCHEMAS_V1)
    this.version(2).stores(LEGACY_TABLE_SCHEMAS_V2)
    this.version(3).stores(LEGACY_TABLE_SCHEMAS_V3)
    this.version(SCHEMA_VERSION).stores(TABLE_SCHEMAS)
  }
}

/** 默认桌面 / 浏览器驱动：IndexedDB via Dexie */
export class DexieStorageDriver implements StorageDriver {
  private readonly db = new StudyPalDatabase()

  async get<T extends TableName>(table: T, id: string): Promise<TableMap[T] | undefined> {
    try {
      return (await this.db.table(table).get(id)) as TableMap[T] | undefined
    } catch (error) {
      throw wrapStorageError(error, '读取本地数据')
    }
  }

  async all<T extends TableName>(table: T): Promise<TableMap[T][]> {
    try {
      return (await this.db.table(table).toArray()) as TableMap[T][]
    } catch (error) {
      throw wrapStorageError(error, '读取本地数据')
    }
  }

  async put<T extends TableName>(table: T, row: TableMap[T]): Promise<void> {
    try {
      await this.db.table(table).put(row)
    } catch (error) {
      throw wrapStorageError(error, '写入本地数据')
    }
  }

  async bulkPut<T extends TableName>(table: T, rows: TableMap[T][]): Promise<void> {
    if (rows.length === 0) return
    try {
      await this.db.table(table).bulkPut(rows)
    } catch (error) {
      throw wrapStorageError(error, '批量写入本地数据')
    }
  }

  async remove(table: TableName, id: string): Promise<void> {
    try {
      await this.db.table(table).delete(id)
    } catch (error) {
      throw wrapStorageError(error, '删除本地数据')
    }
  }

  async query<T extends TableName>(
    table: T,
    predicate: (row: TableMap[T]) => boolean
  ): Promise<TableMap[T][]> {
    const rows = await this.all(table)
    return rows.filter(predicate)
  }

  async clear(table: TableName): Promise<void> {
    try {
      await this.db.table(table).clear()
    } catch (error) {
      throw wrapStorageError(error, '清空本地数据')
    }
  }

  close(): void {
    this.db.close()
  }
}
