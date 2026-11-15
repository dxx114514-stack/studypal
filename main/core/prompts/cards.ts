import type { StudyStage } from '../types/curriculum'
import { basePersona } from './base'
import type { BuiltPrompt } from './qa'

export type CardDraftKind = 'word' | 'question' | 'mixed'

export interface CardsPromptOptions {
  kind: CardDraftKind
  stage: StudyStage
  subject: string
  source: string
  count?: number
}

const EXAMPLE_WORD = `{
  "type": "word",
  "front": "abandon /əˈbændən/",
  "back": "v. 放弃；抛弃\\n例句：He abandoned his plan.\\n助记：a + bandon → 不绑定 → 放弃",
  "tags": ["英语", "动词", "高频词"],
  "review_intervals": [1, 3, 7, 14, 30]
}`

const EXAMPLE_QUESTION = `{
  "type": "question",
  "front": "已知抛物线顶点为 (1, -3)，且过点 (3, 5)，求解析式。",
  "back": "答案：$y = 2(x-1)^2 - 3$\\n考点：二次函数顶点式\\n易错点：代入点时符号错误",
  "tags": ["数学", "二次函数", "顶点式"],
  "review_intervals": [1, 3, 7, 14, 30]
}`

const RULES = [
  '你的任务：从学习材料中提炼智能复习卡片。',
  '输出规则（必须严格遵守）：',
  '1. 只输出一个 JSON 数组，不要输出代码块围栏、解释或任何多余文字。',
  '2. 每个元素包含字段：type（word 或 question）、front、back、tags、review_intervals。',
  '3. review_intervals 默认 [1, 3, 7, 14, 30]。',
  '4. front 用于提问，必须能独立理解；back 可包含多行，用 \\n 表示换行。',
  '5. 单词卡 back 至少包含释义、一个例句、一个助记；错题卡 back 至少包含答案、考点、易错点。',
  '6. 公式使用 LaTeX（$...$），在 JSON 字符串中反斜杠必须转义为 \\\\。',
  '7. 不编造原材料中不存在的题目或单词。'
].join('\n')

export function buildCardsPrompt(options: CardsPromptOptions): BuiltPrompt {
  const system = [
    basePersona({ stage: options.stage, subject: options.subject }),
    '',
    RULES,
    '',
    '单词卡示例：',
    EXAMPLE_WORD,
    '',
    '错题卡示例：',
    EXAMPLE_QUESTION
  ].join('\n')

  const kindText = options.kind === 'mixed' ? '单词/概念卡与错题卡混合' : options.kind === 'word' ? '只生成单词/概念卡' : '只生成错题卡'
  const user = [
    `卡片类型：${kindText}`,
    `数量：${options.count ?? 5} 张左右`,
    '学习材料：',
    options.source.trim()
  ].join('\n\n')

  return { system, user }
}
