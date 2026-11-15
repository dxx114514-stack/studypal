import type { MindNode } from '../types/mindmap'
import { newId } from '../utils/id'

const HEADING_RE = /^\s{0,3}(#{1,6})\s+(.+?)\s*$/
const BULLET_RE = /^([ \t]*)(?:[-*+]|\d+[.)])\s+(.+)$/
const FENCE_RE = /^\s*(```|~~~)/
const THEMATIC_RE = /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/
const QUOTE_RE = /^\s*>/
const COMMENT_RE = /^\s*<!--/

export interface ParseOptions {
  /** 多根节点时合成的根标题 */
  rootTitle?: string
  /** 空内容时的兜底标题 */
  fallbackTitle?: string
}

/**
 * 同时支持两种 OneLook 生态常见写法：
 * 1. 标题式：# 根 / ## 分支 / ### 子分支（Markmap、Obsidian 原生渲染）
 * 2. 缩进列表式：# 根 / 两空格缩进 - 子节点（OneLook 直接导入）
 * 两种写法可混用，层级由标题与缩进共同推断。
 */
export function parseMarkdownToTree(markdown: string, options: ParseOptions = {}): MindNode {
  const source = unwrapOuterFence(markdown)
  const virtualRoot: MindNode = { id: newId('map'), text: '', depth: -1, children: [] }
  const stack: MindNode[] = []
  let headingDepth = -1
  let bulletBaseIndent: number | null = null
  let inCode = false

  for (const rawLine of source.split(/\r?\n/)) {
    if (FENCE_RE.test(rawLine)) {
      inCode = !inCode
      continue
    }
    if (inCode) continue

    const line = rawLine.replace(/\s+$/, '')
    if (!line.trim()) continue
    if (QUOTE_RE.test(line) || COMMENT_RE.test(line) || THEMATIC_RE.test(line)) continue

    const heading = HEADING_RE.exec(line)
    if (heading) {
      const text = cleanText(heading[2])
      if (!text) continue
      headingDepth = heading[1].length - 1
      bulletBaseIndent = null
      insertNode(virtualRoot, stack, headingDepth, text)
      continue
    }

    const bullet = BULLET_RE.exec(line)
    if (bullet) {
      const text = cleanText(bullet[2])
      if (!text) continue
      const indentUnits = Math.floor(expandTabs(bullet[1]).length / 2)
      if (bulletBaseIndent === null) bulletBaseIndent = indentUnits
      const relative = Math.max(0, indentUnits - bulletBaseIndent)
      const depth = headingDepth >= 0 ? headingDepth + 1 + relative : relative
      insertNode(virtualRoot, stack, depth, text)
      continue
    }

    const text = cleanText(line)
    if (!text) continue
    insertNode(virtualRoot, stack, headingDepth >= 0 ? headingDepth + 1 : 0, text)
  }

  return finalize(virtualRoot, options)
}

function insertNode(root: MindNode, stack: MindNode[], requestedDepth: number, text: string): void {
  while (stack.length > 0 && stack[stack.length - 1].depth >= requestedDepth) {
    stack.pop()
  }
  const parent = stack.length > 0 ? stack[stack.length - 1] : root
  const node: MindNode = { id: newId('n'), text, depth: parent.depth + 1, children: [] }
  parent.children.push(node)
  stack.push(node)
}

function finalize(root: MindNode, options: ParseOptions): MindNode {
  const fallback = options.fallbackTitle ?? options.rootTitle ?? '思维导图'
  if (root.children.length === 0) {
    return { id: root.id, text: fallback, depth: 0, children: [] }
  }

  const finalRoot =
    root.children.length === 1
      ? root.children[0]
      : { id: root.id, text: options.rootTitle ?? fallback, depth: 0, children: root.children }

  return normalizeDepth(finalRoot, 0)
}

function normalizeDepth(node: MindNode, depth: number): MindNode {
  node.depth = depth
  node.children.forEach((child) => normalizeDepth(child, depth + 1))
  return node
}

function cleanText(input: string): string {
  return input.replace(/<!--.*?-->/g, '').replace(/\s+#+\s*$/, '').trim()
}

function expandTabs(input: string): string {
  return input.replace(/\t/g, '  ')
}

function unwrapOuterFence(markdown: string): string {
  const trimmed = markdown.trim()
  const match = trimmed.match(/^```[a-zA-Z0-9_-]*\s*\n([\s\S]*?)\n?```$/)
  return match ? match[1] : markdown
}
