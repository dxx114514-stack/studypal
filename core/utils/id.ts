const globalCrypto = globalThis as {
  crypto?: { randomUUID?: () => string }
}

/** 跨端唯一 ID：优先 crypto.randomUUID，降级为随机串 */
export function newId(prefix = 'id'): string {
  const uuid = globalCrypto.crypto?.randomUUID?.()
  if (uuid) return `${prefix}_${uuid}`
  const rand = Math.random().toString(36).slice(2, 10)
  return `${prefix}_${Date.now().toString(36)}${rand}`
}
