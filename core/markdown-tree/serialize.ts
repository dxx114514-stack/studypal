import type { MindNode } from '../types/mindmap'

/** 输出标题式 Markdown（Markmap / Obsidian 原生渲染，也是 AI 默认格式） */
export function treeToHeadingMarkdown(root: MindNode): string {
  const lines: string[] = []

  const walk = (node: MindNode, depth: number): void => {
    if (depth < 6) {
      lines.push(`${'#'.repeat(depth + 1)} ${node.text}`)
    } else {
      lines.push(`${'  '.repeat(depth - 6)}- ${node.text}`)
    }
    node.children.forEach((child) => walk(child, depth + 1))
  }

  walk(root, 0)
  return `${lines.join('\n')}\n`
}

/**
 * 输出 OneLook 可直接导入的缩进列表 Markdown：
 * # 根节点
 *   - 一级分支
 *     - 二级分支
 */
export function treeToOnelookMarkdown(root: MindNode): string {
  const lines: string[] = [`# ${root.text}`]

  const walk = (node: MindNode, level: number): void => {
    node.children.forEach((child) => {
      lines.push(`${'  '.repeat(level)}- ${child.text}`)
      walk(child, level + 1)
    })
  }

  walk(root, 1)
  return `${lines.join('\n')}\n`
}

export function treeToJson(root: MindNode): string {
  return JSON.stringify(root, null, 2)
}

export function countNodes(root: MindNode): number {
  return 1 + root.children.reduce((sum, child) => sum + countNodes(child), 0)
}
