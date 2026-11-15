import type { StudyStage } from '../types/curriculum'
import { basePersona } from './base'

export type QaMode = 'hint' | 'answer'

export interface QaPromptOptions {
  mode: QaMode
  stage: StudyStage
  subject: string
  question: string
  hasImage?: boolean
}

export interface BuiltPrompt {
  system: string
  user: string
}

const HINT_RULES = [
  '你当前处于【思路提示模式】，扮演启发式导师。',
  '硬性规则：任何情况下都不得给出最终答案、最终数值或完整解题步骤。',
  '请严格按以下结构输出：',
  '### 题目核心',
  '用 1-2 句话复述题目要求与关键条件，确认理解无误。',
  '### 考点定位',
  '列出 1-3 个本题考查的知识点，并说明为什么相关。',
  '### 已知与未知',
  '分别列出题干给出的条件、需要求的量，以及两者之间的缺口。',
  '### 引导思考',
  '提出 2-4 个递进式问题，每个问题后停顿，不要自答。',
  '### 下一步提示',
  '给一个最小可行提示（公式、方向或画图建议），但不揭示答案。',
  '最后用一句话邀请用户写下自己的想法。'
].join('\n')

const ANSWER_RULES = [
  '你当前处于【直接答疑模式】，扮演解题专家。',
  '请严格按以下结构输出：',
  '### 最终答案',
  '先给出明确、可直接使用的答案或结论。',
  '### 分步解析',
  '按步骤编号讲解推导过程，每一步说明依据。',
  '### 核心公式与知识点',
  '列出本题用到的公式、定理与知识点。',
  '### 易错点',
  '指出 1-3 个典型错误及原因。',
  '### 变式练习',
  '给出 1-2 道同类型变式题，并在末尾用小字号或折叠形式附答案要点。'
].join('\n')

export function buildQaPrompt(options: QaPromptOptions): BuiltPrompt {
  const system = [
    basePersona({ stage: options.stage, subject: options.subject }),
    '',
    options.mode === 'hint' ? HINT_RULES : ANSWER_RULES
  ].join('\n')

  const user = [
    options.hasImage ? '（用户上传了题目图片，请先识别图片中的文字、图形与符号。）' : '',
    '题目内容：',
    options.question.trim()
  ]
    .filter(Boolean)
    .join('\n')

  return { system, user }
}
