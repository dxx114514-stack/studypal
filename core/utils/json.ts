/**
 * 从模型输出中提取 JSON（容忍 ```json 代码块、前后解释文字）。
 */
export function extractJson<T>(text: string): T {
  const cleaned = stripCodeFence(text.trim())
  try {
    return JSON.parse(cleaned) as T
  } catch {
    const start = findFirstJsonStart(cleaned)
    if (start < 0) throw new Error('未找到 JSON 内容')
    const end = findBalancedEnd(cleaned, start)
    if (end < 0) throw new Error('JSON 括号不匹配')
    return JSON.parse(cleaned.slice(start, end + 1)) as T
  }
}

export function safeJsonParse<T>(text: string, fallback: T): T {
  try {
    return extractJson<T>(text)
  } catch {
    return fallback
  }
}

function stripCodeFence(text: string): string {
  const match = text.match(/^```[a-zA-Z0-9_-]*\s*\n([\s\S]*?)\n?```$/)
  return match ? match[1].trim() : text
}

function findFirstJsonStart(text: string): number {
  const objectStart = text.indexOf('{')
  const arrayStart = text.indexOf('[')
  if (objectStart < 0) return arrayStart
  if (arrayStart < 0) return objectStart
  return Math.min(objectStart, arrayStart)
}

/** 从 start 开始做括号匹配，忽略字符串内部与转义字符 */
function findBalancedEnd(text: string, start: number): number {
  const open = text[start]
  const close = open === '{' ? '}' : ']'
  let depth = 0
  let inString = false
  let escaped = false

  for (let i = start; i < text.length; i += 1) {
    const char = text[i]
    if (inString) {
      if (escaped) escaped = false
      else if (char === '\\') escaped = true
      else if (char === '"') inString = false
      continue
    }
    if (char === '"') {
      inString = true
      continue
    }
    if (char === open) depth += 1
    else if (char === close) {
      depth -= 1
      if (depth === 0) return i
    }
  }
  return -1
}
