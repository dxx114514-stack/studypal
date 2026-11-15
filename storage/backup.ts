import { SCHEMA_VERSION, TABLE_NAMES, type TableMap, type TableName } from './schema'
import type { StorageDriver } from './driver'

export interface BackupFile {
  app: 'dxxs-studypal'
  schemaVersion: number
  exportedAt: string
  tables: { [K in TableName]?: TableMap[K][] }
}

/** 本地全量导出：用于多端迁移、手动备份（不涉及任何服务器） */
export async function exportAll(driver: StorageDriver): Promise<BackupFile> {
  const tables: BackupFile['tables'] = {}
  for (const name of TABLE_NAMES) {
    const rows = await driver.all(name)
    ;(tables as Record<string, unknown>)[name] = rows
  }
  return {
    app: 'dxxs-studypal',
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    tables
  }
}

export interface ImportResult {
  imported: number
  skipped: number
}

/** 导入备份：默认合并写入（同 id 覆盖），replace=true 时先清空 */
export async function importAll(
  driver: StorageDriver,
  data: unknown,
  options: { replace?: boolean } = {}
): Promise<ImportResult> {
  if (!isBackupFile(data)) {
    throw new Error('备份文件格式不正确')
  }

  if (options.replace) {
    for (const name of TABLE_NAMES) {
      await driver.clear(name)
    }
  }

  let imported = 0
  let skipped = 0
  for (const name of TABLE_NAMES) {
    const rows = data.tables[name]
    if (!Array.isArray(rows)) continue
    if (rows.length === 0) {
      skipped += 1
      continue
    }
    await driver.bulkPut(name, rows as TableMap[typeof name][])
    imported += rows.length
  }

  return { imported, skipped }
}

function isBackupFile(value: unknown): value is BackupFile {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  return record.app === 'dxxs-studypal' && typeof record.tables === 'object' && record.tables !== null
}
