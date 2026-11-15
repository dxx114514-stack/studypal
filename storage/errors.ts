export class StorageError extends Error {
  readonly code = 'STORAGE_WRITE_FAILED'

  constructor(message: string, options: { cause?: unknown } = {}) {
    super(message, { cause: options.cause })
    this.name = 'StorageError'
  }
}

export function wrapStorageError(error: unknown, action: string): StorageError {
  if (error instanceof StorageError) return error
  const detail = error instanceof Error ? error.message : String(error)
  return new StorageError(`${action}失败：${detail}`, { cause: error })
}
