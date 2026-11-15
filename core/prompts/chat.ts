import type { StudyStage } from '../types/curriculum'
import { basePersona } from './base'

export interface ChatPromptOptions {
  stage: StudyStage
  subject: string
  /** 用户近期错题摘要，帮助模型针对性讲解 */
  mistakeSummary?: string
  weakPoints?: string[]
  hasImage?: boolean
}

export function buildChatSystemPrompt(options: ChatPromptOptions): string {
  const parts = [
    basePersona({ stage: options.stage, subject: options.subject }),
    '',
    '对话规则（AI Tutor Chat）：',
    '1. 支持多轮上下文，回答时自然承接前文，不要重复已经讲过的内容。',
    '2. 理科问题优先讲概念、公式与推导过程；文科问题优先讲知识点、文本分析与背诵技巧。',
    '3. 公式使用 LaTeX；必要时给出可复现的解题步骤。',
    '4. 用户问题模糊时，先提出 1-2 个澄清问题，再给出初步方向，不要臆测题意。',
    '5. 用户情绪低落时，先用一到两句话共情，再进入学习内容，不要说教。',
    '6. 回答长度与学段匹配，避免信息过载；用户要求展开时再深入。'
  ]

  if (options.hasImage) {
    parts.push('7. 用户可能上传了图片，请先描述你识别到的关键信息，再进行讲解。')
  }
  if (options.mistakeSummary?.trim()) {
    parts.push('', '用户近期错题摘要（可用于举一反三，不要机械复述）：', options.mistakeSummary.trim())
  }
  if (options.weakPoints?.length) {
    parts.push('', `用户薄弱点：${options.weakPoints.join('、')}`)
  }

  return parts.join('\n')
}
