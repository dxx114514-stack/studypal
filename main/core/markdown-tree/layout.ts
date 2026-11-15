import type { MindMapEdge, MindMapLayoutResult, MindNode, MindNodeLayout } from '../types/mindmap'

export interface LayoutOptions {
  nodeHeight?: number
  levelGap?: number
  siblingGap?: number
  padding?: number
  charWidth?: number
  minNodeWidth?: number
  maxNodeWidth?: number
}

const DEFAULTS: Required<LayoutOptions> = {
  nodeHeight: 38,
  levelGap: 64,
  siblingGap: 14,
  padding: 32,
  charWidth: 9,
  minNodeWidth: 96,
  maxNodeWidth: 260
}

export function measureNodeWidth(text: string, options: LayoutOptions = {}): number {
  const merged = { ...DEFAULTS, ...options }
  const width = text.length * merged.charWidth + 32
  return Math.min(merged.maxNodeWidth, Math.max(merged.minNodeWidth, width))
}

/**
 * 纯函数树布局：从左到右按层排布，父节点垂直居中于子树。
 * 不依赖 DOM，桌面 / 移动 / SVG / Canvas 均可复用。
 */
export function layoutTree(root: MindNode, options: LayoutOptions = {}): MindMapLayoutResult {
  const merged = { ...DEFAULTS, ...options }
  const nodes: MindNodeLayout[] = []
  const edges: MindMapEdge[] = []
  const depthWidths = new Map<number, number>()

  const collect = (node: MindNode, parent?: MindNodeLayout): void => {
    const width = measureNodeWidth(node.text, options)
    depthWidths.set(node.depth, Math.max(depthWidths.get(node.depth) ?? 0, width))
    const layoutNode: MindNodeLayout = {
      id: node.id,
      text: node.text,
      depth: node.depth,
      x: 0,
      y: 0,
      width,
      height: merged.nodeHeight,
      parentId: parent?.id
    }
    nodes.push(layoutNode)
    if (parent) edges.push({ from: parent.id, to: node.id })
    node.children.forEach((child) => collect(child, layoutNode))
  }
  collect(root)

  const maxDepth = nodes.reduce((max, node) => Math.max(max, node.depth), 0)
  const xByDepth: number[] = []
  let cursorX = merged.padding
  for (let depth = 0; depth <= maxDepth; depth += 1) {
    xByDepth[depth] = cursorX
    cursorX += (depthWidths.get(depth) ?? 0) + merged.levelGap
  }

  const byId = new Map(nodes.map((node) => [node.id, node]))
  let cursorY = merged.padding

  const place = (node: MindNode): number => {
    const layoutNode = byId.get(node.id)
    if (!layoutNode) return cursorY
    layoutNode.x = xByDepth[node.depth] ?? merged.padding

    if (node.children.length === 0) {
      layoutNode.y = cursorY
      cursorY += merged.nodeHeight + merged.siblingGap
      return layoutNode.y
    }

    const childYs = node.children.map((child) => place(child))
    const y = (childYs[0] + childYs[childYs.length - 1]) / 2
    layoutNode.y = y
    cursorY = Math.max(cursorY, y + merged.nodeHeight + merged.siblingGap)
    return y
  }

  place(root)

  const width = nodes.reduce((max, node) => Math.max(max, node.x + node.width), 0) + merged.padding
  const height = Math.max(cursorY + merged.padding, merged.padding * 2)
  return { nodes, edges, width, height }
}
