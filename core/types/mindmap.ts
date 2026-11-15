/**
 * 思维导图数据模型。
 * 与 OneLook / Markmap / Obsidian 的 Markdown 大纲保持同构。
 */
export interface MindNode {
  id: string
  text: string
  /** 根节点为 0，逐层递增 */
  depth: number
  children: MindNode[]
}

export interface MindMapDocument {
  id: string
  title: string
  /** 当前文档的 Markdown 源（标题式或缩进列表式均可） */
  markdown: string
  updatedAt: number
  createdAt: number
}

export interface MindNodeLayout {
  id: string
  text: string
  depth: number
  x: number
  y: number
  width: number
  height: number
  parentId?: string
}

export interface MindMapEdge {
  from: string
  to: string
}

export interface MindMapLayoutResult {
  nodes: MindNodeLayout[]
  edges: MindMapEdge[]
  width: number
  height: number
}
