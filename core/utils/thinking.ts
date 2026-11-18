export interface ThinkingSegment {
  type: 'text' | 'think'
  content: string
  /** 是否已出现闭合标签；流式输出过程中可能为 false */
  closed: boolean
}

const OPEN_TAG = /<(think|thinking|reasoning)>/i
const CLOSE_TAG = /<\/(?:think|thinking|reasoning)>/i

/**
 * 把模型输出拆成普通文本与思考段落。
 * 支持 `<think>` / `<thinking>` / `<reasoning>`，大小写不敏感；
 * 流式输出里尚未闭合的标签会把剩余内容整体视为思考中。
 */
export function parseThinking(text: string): ThinkingSegment[] {
  const segments: ThinkingSegment[] = []
  let rest = text ?? ''
  let guard = 0

  while (rest && guard < 100) {
    guard += 1
    const open = rest.match(OPEN_TAG)
    if (!open || open.index === undefined) {
      segments.push({ type: 'text', content: rest, closed: true })
      break
    }

    if (open.index > 0) {
      segments.push({ type: 'text', content: rest.slice(0, open.index), closed: true })
    }

    const afterOpen = rest.slice(open.index + open[0].length)
    const close = afterOpen.search(CLOSE_TAG)

    if (close === -1) {
      segments.push({ type: 'think', content: afterOpen, closed: false })
      break
    }

    const closeMatch = afterOpen.slice(close).match(CLOSE_TAG)
    const closeLength = closeMatch?.[0].length ?? 0
    segments.push({ type: 'think', content: afterOpen.slice(0, close), closed: true })
    rest = afterOpen.slice(close + closeLength)
  }

  return segments.filter((segment) => segment.type === 'think' || segment.content.trim() !== '')
}

/** 输出中是否包含思考标签 */
export function hasThinking(text: string): boolean {
  return OPEN_TAG.test(text ?? '')
}

/** 去掉思考段落，只保留正文 */
export function stripThinking(text: string): string {
  return parseThinking(text)
    .filter((segment) => segment.type === 'text')
    .map((segment) => segment.content)
    .join('')
    .trim()
}
