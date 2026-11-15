import { describe, expect, it } from 'vitest'
import { parseMarkdownToTree } from '../../core/markdown-tree/parse'
import {
  countNodes,
  treeToHeadingMarkdown,
  treeToJson,
  treeToOnelookMarkdown
} from '../../core/markdown-tree/serialize'
import type { MindNode } from '../../core/types/mindmap'

describe('parseMarkdownToTree / 标题式', () => {
  const tree = parseMarkdownToTree('# 根\n## A\n### A1\n## B')

  it('按标题层级建树', () => {
    expect(tree.text).toBe('根')
    expect(tree.children.map((node) => node.text)).toEqual(['A', 'B'])
    expect(tree.children[0].children.map((node) => node.text)).toEqual(['A1'])
  })

  it('depth 从 0 开始逐层递增', () => {
    expect(tree.depth).toBe(0)
    expect(tree.children[0].depth).toBe(1)
    expect(tree.children[0].children[0].depth).toBe(2)
  })

  it('节点数量正确', () => {
    expect(countNodes(tree)).toBe(4)
  })
})

describe('parseMarkdownToTree / 缩进列表式', () => {
  it('按两个空格一层解析 OneLook 风格', () => {
    const tree = parseMarkdownToTree('# 根\n  - A\n    - A1\n  - B')
    expect(tree.text).toBe('根')
    expect(tree.children.map((node) => node.text)).toEqual(['A', 'B'])
    expect(tree.children[0].children.map((node) => node.text)).toEqual(['A1'])
  })

  it('没有标题时以列表首项为根', () => {
    const tree = parseMarkdownToTree('- a\n  - b')
    expect(tree.text).toBe('a')
    expect(tree.children.map((node) => node.text)).toEqual(['b'])
    expect(tree.depth).toBe(0)
  })

  it('支持制表符缩进', () => {
    const tree = parseMarkdownToTree('# 根\n\t- A\n\t\t- A1')
    expect(tree.children[0].children[0].text).toBe('A1')
  })
})

describe('parseMarkdownToTree / 边界情况', () => {
  it('多个一级标题时合成根节点', () => {
    const tree = parseMarkdownToTree('# A\n## a1\n# B')
    expect(tree.text).toBe('思维导图')
    expect(tree.children.map((node) => node.text)).toEqual(['A', 'B'])
  })

  it('可通过 rootTitle 指定合成根标题', () => {
    const tree = parseMarkdownToTree('# A\n# B', { rootTitle: '总览' })
    expect(tree.text).toBe('总览')
  })

  it('空内容回退到兜底标题', () => {
    expect(parseMarkdownToTree('   ').text).toBe('思维导图')
    expect(parseMarkdownToTree('', { fallbackTitle: '我的导图' }).text).toBe('我的导图')
  })

  it('忽略代码块、引用、分隔线与注释', () => {
    const tree = parseMarkdownToTree('# 根\n```\n# 假标题\n```\n> 引用\n<!-- 注释 -->\n---\n## 真')
    expect(tree.children.map((node) => node.text)).toEqual(['真'])
    expect(countNodes(tree)).toBe(2)
  })

  it('自动去掉模型返回的外层代码围栏', () => {
    const tree = parseMarkdownToTree('```markdown\n# 根\n## A\n```')
    expect(tree.text).toBe('根')
    expect(tree.children.map((node) => node.text)).toEqual(['A'])
  })
})

describe('serialize', () => {
  const tree = parseMarkdownToTree('# 根\n## A\n### A1\n## B')

  it('标题式输出', () => {
    expect(treeToHeadingMarkdown(tree)).toBe('# 根\n## A\n### A1\n## B\n')
  })

  it('OneLook 缩进式输出', () => {
    expect(treeToOnelookMarkdown(tree)).toBe('# 根\n  - A\n    - A1\n  - B\n')
  })

  it('OneLook 输出可被重新解析还原结构', () => {
    const again = parseMarkdownToTree(treeToOnelookMarkdown(tree))
    expect(again.text).toBe('根')
    expect(again.children.map((node) => node.text)).toEqual(['A', 'B'])
    expect(again.children[0].children.map((node) => node.text)).toEqual(['A1'])
  })

  it('超过 6 层后退化为缩进列表', () => {
    let node: MindNode = { id: 'n7', text: 'L7', depth: 7, children: [] }
    for (let depth = 6; depth >= 0; depth -= 1) {
      node = { id: `n${depth}`, text: `L${depth}`, depth, children: [node] }
    }

    const lines = treeToHeadingMarkdown(node).trimEnd().split('\n')
    expect(lines[5]).toBe('###### L5')
    expect(lines[6]).toBe('- L6')
    expect(lines[7]).toBe('  - L7')
  })

  it('JSON 输出可反序列化', () => {
    expect(JSON.parse(treeToJson(tree))).toMatchObject({ text: '根' })
  })
})
