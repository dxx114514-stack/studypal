import { describe, expect, it } from 'vitest'
import { hasThinking, parseThinking, stripThinking } from '../../core/utils/thinking'

describe('parseThinking', () => {
  it('没有标签时只返回一段正文', () => {
    expect(parseThinking('普通回答')).toEqual([
      { type: 'text', content: '普通回答', closed: true }
    ])
  })

  it('拆出闭合的思考块与正文', () => {
    const segments = parseThinking('前文<think>推理过程</think>后文')
    expect(segments.map((item) => item.type)).toEqual(['text', 'think', 'text'])
    expect(segments[1]).toEqual({ type: 'think', content: '推理过程', closed: true })
    expect(segments[2].content).toBe('后文')
  })

  it('兼容 thinking / reasoning 与大小写', () => {
    expect(parseThinking('<THINKING>a</THINKING>').map((item) => item.type)).toEqual(['think'])
    expect(parseThinking('<Reasoning>b</Reasoning>')[0].content).toBe('b')
  })

  it('流式未闭合时把剩余内容当成思考中', () => {
    const segments = parseThinking('正文<think>还在想')
    expect(segments).toHaveLength(2)
    expect(segments[1]).toEqual({ type: 'think', content: '还在想', closed: false })
  })

  it('支持多个思考块', () => {
    const segments = parseThinking('<think>一</think>中间<think>二</think>')
    expect(segments.map((item) => item.type)).toEqual(['think', 'text', 'think'])
  })

  it('丢弃空白正文，保留空的思考块', () => {
    expect(parseThinking('  <think></think>  ')).toEqual([{ type: 'think', content: '', closed: true }])
    expect(parseThinking('<think></think>')).toEqual([{ type: 'think', content: '', closed: true }])
  })

  it('空字符串返回空数组', () => {
    expect(parseThinking('')).toEqual([])
  })
})

describe('hasThinking / stripThinking', () => {
  it('识别思考标签', () => {
    expect(hasThinking('a<think>b')).toBe(true)
    expect(hasThinking('普通文本')).toBe(false)
  })

  it('去掉思考内容只留正文', () => {
    expect(stripThinking('<think>推理</think>答案')).toBe('答案')
    expect(stripThinking('<think>推理</think>')).toBe('')
  })
})
