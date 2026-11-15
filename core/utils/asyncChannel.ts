/**
 * 无平台依赖的异步通道：用于把「回调式」数据流转换成 AsyncIterable。
 * Electron 本地代理的 IPC 事件、移动端原生事件都可通过它接入统一流式接口。
 */
export interface AsyncChannel<T> extends AsyncIterable<T> {
  push(value: T): void
  close(): void
  fail(error: unknown): void
}

export function createAsyncChannel<T>(): AsyncChannel<T> {
  const queue: T[] = []
  let closed = false
  let failure: unknown = null
  let pending: {
    resolve: (result: IteratorResult<T>) => void
    reject: (error: unknown) => void
  } | null = null

  const settle = (): void => {
    if (!pending) return
    if (queue.length > 0) {
      const value = queue.shift() as T
      const waiter = pending
      pending = null
      waiter.resolve({ value, done: false })
      return
    }
    if (failure !== null) {
      const waiter = pending
      pending = null
      waiter.reject(failure)
      return
    }
    if (closed) {
      const waiter = pending
      pending = null
      waiter.resolve({ value: undefined, done: true } as IteratorResult<T>)
    }
  }

  return {
    push(value: T): void {
      if (closed) return
      queue.push(value)
      settle()
    },
    close(): void {
      closed = true
      settle()
    },
    fail(error: unknown): void {
      failure = error ?? new Error('流式通道异常结束')
      closed = true
      settle()
    },
    [Symbol.asyncIterator](): AsyncIterator<T> {
      return {
        next(): Promise<IteratorResult<T>> {
          if (queue.length > 0) {
            return Promise.resolve({ value: queue.shift() as T, done: false })
          }
          if (failure !== null) return Promise.reject(failure)
          if (closed) {
            return Promise.resolve({ value: undefined, done: true } as IteratorResult<T>)
          }
          return new Promise<IteratorResult<T>>((resolve, reject) => {
            pending = { resolve, reject }
          })
        },
        return(): Promise<IteratorResult<T>> {
          closed = true
          settle()
          return Promise.resolve({ value: undefined, done: true } as IteratorResult<T>)
        }
      }
    }
  }
}
