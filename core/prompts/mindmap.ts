import type { StudyStage } from '../types/curriculum'
import { basePersona } from './base'
import type { BuiltPrompt } from './qa'

export interface MindMapPromptOptions {
  stage: StudyStage
  subject: string
  /** OCR 文本 / 粘贴的 Markdown / 课件识别文本 / 选中内容 */
  source: string
  title?: string
  maxDepth?: number
}

const EXAMPLE = [
  '# 二次函数',
  '## 基本概念',
  '- 一般式：$y = ax^2 + bx + c$',
  '- 顶点式：$y = a(x-h)^2 + k$',
  '- 交点式：$y = a(x-x_1)(x-x_2)$',
  '## 图像性质',
  '- 开口方向由 $a$ 决定',
  '- 对称轴：$x = -\\frac{b}{2a}$',
  '- 顶点坐标：$(h, k)$',
  '## 常见题型',
  '- 求解析式',
  '- 求最值',
  '- 判断图像位置',
  '- 与方程、不等式结合'
].join('\n')

const RULES = [
  '你的任务：把杂乱的学习材料整理成结构清晰的思维导图，并输出 OneLook 兼容的 Markdown。',
  '输出规则（必须严格遵守）：',
  '1. 根节点用一级标题 #，主分支用 ##，子分支用 ###、####。',
  '2. 也可用无序列表 - 表达层级，但缩进必须规范（每层 2 个空格）。',
  '3. 每个节点尽量简短，优先关键词或短语，层级默认不超过 4 层。',
  '4. 支持标准 Markdown 语法与 LaTeX 公式（$...$ 或 $$...$$）。',
  '5. 禁止输出多余解释、开场白、总结语、代码块围栏，只输出可渲染的 Markdown。',
  '6. 保留原材料中的事实、数字与专有名词，不要补充材料中没有的内容。',
  '7. 如果原材料是题目或笔记，先归并同类项，再按「概念 / 方法 / 例题 / 易错点」等逻辑分组。'
].join('\n')

export function buildMindMapPrompt(options: MindMapPromptOptions): BuiltPrompt {
  const system = [
    basePersona({ stage: options.stage, subject: options.subject }),
    '',
    RULES,
    '',
    '示例输出：',
    EXAMPLE
  ].join('\n')

  const user = [
    options.title?.trim() ? `导图标题：${options.title.trim()}` : '',
    `最大层级：${options.maxDepth ?? 4}`,
    '原始材料：',
    options.source.trim()
  ]
    .filter(Boolean)
    .join('\n\n')

  return { system, user }
}
