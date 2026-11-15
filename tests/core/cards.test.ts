import { describe, expect, it } from 'vitest'
import { createCardFromDraft, normalizeDrafts, normalizeTags } from '../../core/cards/factory'

describe('normalizeTags', () => {
  it('去掉井号、空白并与去重', () => {
    expect(normalizeTags(['#数学', ' 数学 ', 'math'])).toEqual(['数学', 'math'])
  })

  it('最多保留 8 个标签', () => {
    const tags = normalizeTags(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'])
    expect(tags).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'])
  })

  it('非数组返回空数组', () => {
    expect(normalizeTags()).toEqual([])
    expect(normalizeTags(['', '  ', '#'])).toEqual([])
  })
})

describe('createCardFromDraft', () => {
  it('规范字段并初始化复习状态', () => {
    const card = createCardFromDraft(
      {
        type: 'word',
        front: '  hi  ',
        back: ' 你好 ',
        tags: ['#英语'],
        review_intervals: [7, 1]
      },
      { subject: '英语', source: 'import', now: 1000 }
    )

    expect(card.type).toBe('word')
    expect(card.front).toBe('hi')
    expect(card.back).toBe('你好')
    expect(card.tags).toEqual(['英语'])
    expect(card.reviewIntervals).toEqual([1, 7])
    expect(card.subject).toBe('英语')
    expect(card.source).toBe('import')
    expect(card.createdAt).toBe(1000)
    expect(card.updatedAt).toBe(1000)
    expect(card.state.dueAt).toBe(1000)
    expect(card.state.ease).toBe(2.5)
  })

  it('草稿没给间隔时回退到设置里的间隔', () => {
    const card = createCardFromDraft(
      { type: 'question', front: 'q', back: 'a' },
      { intervals: [30, 1], now: 0 }
    )
    expect(card.reviewIntervals).toEqual([1, 30])
    expect(card.source).toBe('manual')
  })

  it('未知类型归为错题卡', () => {
    const card = createCardFromDraft(
      { type: 'other' as never, front: 'q', back: 'a' },
      { now: 0 }
    )
    expect(card.type).toBe('question')
  })
})

describe('normalizeDrafts', () => {
  it('接受裸数组并丢弃缺字段的项', () => {
    const drafts = normalizeDrafts([
      { front: ' q1 ', back: ' a1 ', type: 'word', tags: ['x'], review_intervals: [1] },
      { front: 'q2', back: '' },
      null,
      'oops'
    ])
    expect(drafts).toHaveLength(1)
    expect(drafts[0]).toMatchObject({
      type: 'word',
      front: 'q1',
      back: 'a1',
      tags: ['x'],
      review_intervals: [1]
    })
  })

  it('接受 { cards: [...] } 结构', () => {
    const drafts = normalizeDrafts({ cards: [{ front: 'q', back: 'a' }] })
    expect(drafts).toHaveLength(1)
    expect(drafts[0].type).toBe('question')
  })

  it('其它结构返回空数组', () => {
    expect(normalizeDrafts({ items: [] })).toEqual([])
    expect(normalizeDrafts('nope')).toEqual([])
    expect(normalizeDrafts(null)).toEqual([])
  })
})
