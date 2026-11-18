/** 从任意 JSON 值中安全读取字符串字段，类型不符时返回空串 */
export function readStringField(source: unknown, key: string): string {
  if (!source || typeof source !== 'object') return ''
  const value = (source as Record<string, unknown>)[key]
  return typeof value === 'string' ? value.trim() : ''
}

/** 从任意 JSON 值中安全读取数组字段，类型不符时返回空数组 */
export function readArrayField(source: unknown, key: string): unknown[] {
  if (!source || typeof source !== 'object') return []
  const value = (source as Record<string, unknown>)[key]
  return Array.isArray(value) ? value : []
}
