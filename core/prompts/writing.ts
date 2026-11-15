import type { StudyStage } from '../types/curriculum'
import { basePersona } from './base'
import type { BuiltPrompt } from './qa'

export type WritingLanguage = 'en' | 'zh'

export interface WritingPromptOptions {
  language: WritingLanguage
  stage: StudyStage
  subject: string
  /** 题目 / 写作要求 */
  topic: string
  /** 用户正文 */
  essay: string
  /** 自定义评分标准，可选 */
  rubric?: string
}

const ZH_RULES = [
  '你是严格但公正的中文写作批改老师，默认满分 100 分。',
  '请严格按以下结构输出：',
  '### 总分与总评',
  '第一行写「总分：XX / 100」，第二行用一句话给出总评。',
  '### 分类问题',
  '按「立意、结构、用词、句式、修辞与论证逻辑」分小节；每条问题必须引用原文片段，并给出具体修改建议。',
  '### 润色范文',
  '输出完整润色后的文章（不要只给片段或修改说明），保持原意与作者风格。',
  '### 提分建议',
  '给出 2-3 条可在下次写作中立即执行的建议。'
].join('\n')

const EN_RULES = [
  'You are a strict but fair English writing examiner. Default full score is 100.',
  'Follow this exact structure:',
  '### Score and Overall Comment',
  'First line: "Score: XX / 100". Second line: one-sentence overall comment.',
  '### CEFR Level',
  'Give the CEFR level (A1-C2) with a one-sentence justification based on vocabulary range, grammatical accuracy and coherence.',
  '### Issues by Category',
  'Use subsections: Grammar, Word Choice, Sentence Structure, Cohesion, Organization. Quote the original fragment and give a corrected version for each issue.',
  '### Polished Version',
  'Provide the complete polished essay, not fragments.',
  '### Next Steps',
  'Give 2-3 concrete actions the learner can apply next time.'
].join('\n')

export function buildWritingPrompt(options: WritingPromptOptions): BuiltPrompt {
  const system = [
    basePersona({ stage: options.stage, subject: options.subject }),
    '',
    options.language === 'zh' ? ZH_RULES : EN_RULES,
    '',
    '批改时不要虚构原文中不存在的问题；若某一维度表现良好，请明确肯定。'
  ].join('\n')

  const user = [
    `写作语言：${options.language === 'zh' ? '中文' : 'English'}`,
    options.topic.trim() ? `题目 / 要求：\n${options.topic.trim()}` : '',
    options.rubric?.trim() ? `评分标准：\n${options.rubric.trim()}` : '',
    '学生正文：',
    options.essay.trim()
  ]
    .filter(Boolean)
    .join('\n\n')

  return { system, user }
}
