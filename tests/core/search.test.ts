import { describe, expect, it } from 'vitest'
import type { AITransport, ProviderHttpRequest } from '../../core/ai/transport'
import { searchWeb } from '../../core/search/index'

const API_KEY = 'unit-test'

function fakeTransport(status: number, body: string) {
  const requests: ProviderHttpRequest[] = []
  const transport: AITransport = {
    async open(request) {
      requests.push(request)
      return {
        meta: { status, ok: status >= 200 && status < 300, headers: {} },
        chunks: (async function* () {
          yield body
        })(),
        abort: () => {},
        dispose: () => {}
      }
    }
  }
  return { transport, requests }
}

function tavilyBody(items: { title: string; url: string; content: string }[]): string {
  return JSON.stringify({ results: items })
}

describe('searchWeb - Tavily', () => {
  it('构建正确请求并解析 results', async () => {
    const { transport, requests } = fakeTransport(
      200,
      tavilyBody([{ title: '结果一', url: 'https://example.com/a', content: '摘要一' }])
    )

    const results = await searchWeb(
      '  量子力学  ',
      { provider: 'tavily', apiKey: API_KEY, maxResults: 3 },
      transport
    )

    expect(results).toEqual([{ title: '结果一', url: 'https://example.com/a', snippet: '摘要一' }])
    expect(requests).toHaveLength(1)
    expect(requests[0].url).toBe('https://api.tavily.com/search')
    expect(JSON.parse(requests[0].body)).toMatchObject({
      api_key: API_KEY,
      query: '量子力学',
      max_results: 3,
      search_depth: 'basic',
      include_answer: false
    })
  })
})

describe('searchWeb - Serper', () => {
  it('使用 X-API-KEY 请求头并解析 organic', async () => {
    const { transport, requests } = fakeTransport(
      200,
      JSON.stringify({
        organic: [{ title: '结果一', link: 'https://example.com/a', snippet: '摘要一' }]
      })
    )

    const results = await searchWeb(
      '光合作用',
      { provider: 'serper', apiKey: API_KEY, maxResults: 4 },
      transport
    )

    expect(results).toEqual([{ title: '结果一', url: 'https://example.com/a', snippet: '摘要一' }])
    expect(requests[0].url).toBe('https://google.serper.dev/search')
    expect(requests[0].headers['X-API-KEY']).toBe(API_KEY)
    expect(JSON.parse(requests[0].body)).toEqual({ q: '光合作用', num: 4 })
  })
})

describe('searchWeb - 错误处理', () => {
  it('401 抛出带状态码与响应片段的中文错误', async () => {
    const { transport } = fakeTransport(401, JSON.stringify({ detail: 'invalid api key' }))

    await expect(
      searchWeb('测试', { provider: 'tavily', apiKey: API_KEY }, transport)
    ).rejects.toThrow('Tavily 搜索失败（401），请检查 API Key')
  })

  it('JSON 解析失败给出可读错误', async () => {
    const { transport } = fakeTransport(200, 'not-json')

    await expect(
      searchWeb('测试', { provider: 'serper', apiKey: API_KEY }, transport)
    ).rejects.toThrow('Serper 返回内容无法解析')
  })

  it('空 query 直接返回空数组且不发起请求', async () => {
    const { transport, requests } = fakeTransport(200, tavilyBody([]))

    const results = await searchWeb('   \n\t ', { provider: 'tavily', apiKey: API_KEY }, transport)

    expect(results).toEqual([])
    expect(requests).toHaveLength(0)
  })
})

describe('searchWeb - 结果整理', () => {
  it('按 url 去重并截断到 maxResults', async () => {
    const { transport } = fakeTransport(
      200,
      tavilyBody([
        { title: 'A', url: 'https://example.com/a', content: 'a' },
        { title: 'A 重复', url: 'https://example.com/a', content: 'a2' },
        { title: 'B', url: 'https://example.com/b', content: 'b' },
        { title: 'C', url: 'https://example.com/c', content: 'c' },
        { title: 'D', url: 'https://example.com/d', content: 'd' }
      ])
    )

    const results = await searchWeb('测试', { provider: 'tavily', apiKey: API_KEY, maxResults: 3 }, transport)

    expect(results.map((item) => item.title)).toEqual(['A', 'B', 'C'])
  })

  it('maxResults 默认 5，下界 1，上界 10', async () => {
    const items = Array.from({ length: 12 }, (_, index) => ({
      title: `R${index + 1}`,
      url: `https://example.com/${index + 1}`,
      content: 'x'
    }))

    const defaultCase = fakeTransport(200, tavilyBody(items))
    const defaultResults = await searchWeb(
      '测试',
      { provider: 'tavily', apiKey: API_KEY },
      defaultCase.transport
    )
    expect(defaultResults).toHaveLength(5)
    expect(JSON.parse(defaultCase.requests[0].body).max_results).toBe(5)

    const lowerCase = fakeTransport(200, tavilyBody(items))
    const lowerResults = await searchWeb(
      '测试',
      { provider: 'tavily', apiKey: API_KEY, maxResults: 0 },
      lowerCase.transport
    )
    expect(lowerResults).toHaveLength(1)
    expect(JSON.parse(lowerCase.requests[0].body).max_results).toBe(1)

    const upperCase = fakeTransport(200, tavilyBody(items))
    const upperResults = await searchWeb(
      '测试',
      { provider: 'tavily', apiKey: API_KEY, maxResults: 99 },
      upperCase.transport
    )
    expect(upperResults).toHaveLength(10)
    expect(JSON.parse(upperCase.requests[0].body).max_results).toBe(10)
  })
})
