/**
 * 示例：Markdown → 树 → 布局 → 双格式导出
 * 运行：npm run example:tree
 */
import {
  countNodes,
  layoutTree,
  parseMarkdownToTree,
  treeToHeadingMarkdown,
  treeToOnelookMarkdown
} from '../core/markdown-tree'

const SAMPLE = `# 二次函数
## 基本概念
- 一般式：$y = ax^2 + bx + c$
- 顶点式：$y = a(x-h)^2 + k$
- 交点式：$y = a(x-x_1)(x-x_2)$
## 图像性质
- 开口方向由 $a$ 决定
- 对称轴：$x = -\\frac{b}{2a}$
- 顶点坐标：$(h, k)$
## 常见题型
- 求解析式
- 求最值
- 判断图像位置
- 与方程、不等式结合`

const tree = parseMarkdownToTree(SAMPLE)
const layout = layoutTree(tree)

console.log('=== 标题版 Markdown（Markmap / Obsidian） ===')
console.log(treeToHeadingMarkdown(tree))

console.log('=== OneLook 导入版（缩进列表） ===')
console.log(treeToOnelookMarkdown(tree))

console.log(`=== 布局结果 ===\n节点数：${countNodes(tree)}\n画布：${Math.round(layout.width)} x ${Math.round(layout.height)}`)
console.log(layout.nodes.slice(0, 4).map((node) => `${node.text} @ (${Math.round(node.x)}, ${Math.round(node.y)})`).join('\n'))
