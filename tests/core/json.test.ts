import { describe, expect, it } from 'vitest'
import { extractJson, safeJsonParse } from '../../core/utils/json'

describe('extractJson', () => {
  it('直接解析纯 JSON', () => {
    expect(extractJson<{ a: number }>('{"a":1}')).toEqual({ a: 1 })
  })

  it('剥离 json 代码围栏', () => {
    expect(extractJson('```json\n[{"a":1}]\n```')).toEqual([{ a: 1 }])
    expect(extractJson('```\n{"b":2}\n```')).toEqual({ b: 2 })
  })

  it('忽略前后解释文字', () => {
    const text = '好的，结果如下：\n{"cards":[]}\n希望有帮助'
    expect(extractJson(text)).toEqual({ cards: [] })
  })

  it('括号匹配会跳过字符串内部的括号', () => {
    const text = 'prefix {"k":"a}b","n":{"c":1}} suffix'
    expect(extractJson(text)).toEqual({ k: 'a}b', n: { c: 1 } })
  })

  it('字符串内的转义引号不影响匹配', () => {
    expect(extractJson('说明 {"k":"say \\"hi\\"","v":2} 结束')).toEqual({ k: 'say "hi"', v: 2 })
  })

  it('没有 JSON 时抛错', () => {
    expect(() => extractJson('完全没有内容')).toThrow('未找到 JSON 内容')
  })

  it('括号不匹配时抛错', () => {
    expect(() => extractJson('{"a":1')).toThrow('JSON 括号不匹配')
  })
})

describe('safeJsonParse', () => {
  it('失败时返回兜底值', () => {
    expect(safeJsonParse('not json', { ok: false })).toEqual({ ok: false })
  })

  it('成功时返回解析结果', () => {
    expect(safeJsonParse('[1,2]', [] as number[])).toEqual([1, 2])
  })
})
