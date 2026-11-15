import { describe, expect, it } from 'vitest'
import { parseBlock, parseSSE, type SSEEvent } from '../../core/ai/sse'

async function* fromChunks(chunks: string[]): AsyncGenerator<string> {
  for (const chunk of chunks) yield chunk
}

async function collect(chunks: string[]): Promise<SSEEvent[]> {
  const events: SSEEvent[] = []
  for await (const event of parseSSE(fromChunks(chunks))) events.push(event)
  return events
}

describe('parseSSE', () => {
  it('跨 chunk 边界拼接事件', async () => {
    const events = await collect(['data: he', 'llo\n\n'])
    expect(events).toEqual([{ event: 'message', data: 'hello', id: undefined }])
  })

  it('一个 chunk 内解析多个事件', async () => {
    const events = await collect(['data: a\n\ndata: b\n\n'])
    expect(events.map((event) => event.data)).toEqual(['a', 'b'])
  })

  it('结束时冲刷未闭合的尾部事件', async () => {
    const events = await collect(['data: tail'])
    expect(events).toHaveLength(1)
    expect(events[0].data).toBe('tail')
  })

  it('支持 event 字段与多行 data', async () => {
    const events = await collect(['event: delta\ndata: l1\ndata: l2\n\n'])
    expect(events[0]).toEqual({ event: 'delta', data: 'l1\nl2', id: undefined })
  })

  it('兼容 CRLF 与注释行', async () => {
    const events = await collect([': keepalive\r\ndata: x\r\n\r\n'])
    expect(events).toHaveLength(1)
    expect(events[0].data).toBe('x')
  })

  it('空输入不产生事件', async () => {
    expect(await collect([])).toEqual([])
    expect(await collect(['\n\n'])).toEqual([])
  })
})

describe('parseBlock', () => {
  it('无 data 字段返回 null', () => {
    expect(parseBlock(': ping')).toBeNull()
    expect(parseBlock('event: done')).toBeNull()
  })

  it('冒号后无空格也能解析', () => {
    expect(parseBlock('data:hi')).toMatchObject({ data: 'hi' })
  })

  it('保留 id 字段', () => {
    expect(parseBlock('id: 7\ndata: x')).toMatchObject({ id: '7', data: 'x' })
  })
})
