import type { ImageInput } from '../../types/chat'

export function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '')
}

export function findLastUserIndex(messages: { role: string }[]): number {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i].role === 'user') return i
  }
  return -1
}

export function toDataUrl(image: ImageInput): string {
  return `data:${image.mimeType};base64,${image.dataBase64}`
}

export function safeParseJson(data: string): any {
  try {
    return JSON.parse(data)
  } catch {
    return null
  }
}

export function readString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}
