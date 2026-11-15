/**
 * 极简 SSE（Server-Sent Events）解析器。
 * 只处理 data / event / id 字段，忽略注释与 retry，满足所有主流 LLM 流式接口。
 */
export interface SSEEvent {
  event: string
  data: string
  id?: string
}

export async function* parseSSE(chunks: AsyncIterable<string>): AsyncGenerator<SSEEvent> {
  let buffer = ''

  for await (const chunk of chunks) {
    buffer += chunk.replace(/\r\n/g, '\n')
    let boundary = buffer.indexOf('\n\n')
    while (boundary !== -1) {
      const block = buffer.slice(0, boundary)
      buffer = buffer.slice(boundary + 2)
      const event = parseBlock(block)
      if (event) yield event
      boundary = buffer.indexOf('\n\n')
    }
  }

  if (buffer.trim()) {
    const event = parseBlock(buffer)
    if (event) yield event
  }
}

export function parseBlock(block: string): SSEEvent | null {
  let event = 'message'
  let id: string | undefined
  const dataLines: string[] = []

  for (const rawLine of block.split('\n')) {
    const line = rawLine.startsWith(':') ? '' : rawLine
    if (!line) continue
    const colon = line.indexOf(':')
    const field = colon === -1 ? line : line.slice(0, colon)
    let value = colon === -1 ? '' : line.slice(colon + 1)
    if (value.startsWith(' ')) value = value.slice(1)

    if (field === 'data') dataLines.push(value)
    else if (field === 'event') event = value
    else if (field === 'id') id = value
  }

  if (dataLines.length === 0) return null
  return { event, data: dataLines.join('\n'), id }
}
