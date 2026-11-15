/**
 * 示例：统一 AI 流式调用（Node 20+，无需 Electron）
 *
 * macOS / Linux:
 *   STUDYPAL_API_KEY=sk-xxx STUDYPAL_BASE_URL=https://api.openai.com/v1 STUDYPAL_MODEL=gpt-4o-mini npm run example:ai
 * Windows PowerShell:
 *   $env:STUDYPAL_API_KEY="sk-xxx"; npm run example:ai
 */
import { AIClient } from '../core/ai/client'
import { buildQaPrompt } from '../core/prompts/qa'
import type { AIRequest } from '../core/types/chat'

const apiKey = process.env['STUDYPAL_API_KEY'] ?? ''
const baseUrl = process.env['STUDYPAL_BASE_URL'] ?? 'https://api.openai.com/v1'
const modelType = process.env['STUDYPAL_MODEL'] ?? 'gpt-4o-mini'

if (!apiKey) {
  console.error('缺少 STUDYPAL_API_KEY，请先设置环境变量后重试。')
  process.exit(1)
}

const prompt = buildQaPrompt({
  mode: 'hint',
  stage: 'junior',
  subject: 'math',
  question: '已知二次函数的顶点为 (1, -3)，且经过点 (3, 5)，求它的解析式。'
})

const request: AIRequest = {
  apiKey,
  modelType,
  customBaseUrl: baseUrl,
  messages: [{ role: 'user', content: prompt.user }],
  systemPrompt: prompt.system,
  stream: true,
  supportsStream: true,
  temperature: 0.4
}

const client = new AIClient()

process.stdout.write('--- 流式输出开始 ---\n')

client
  .stream(request, {
    onDelta: (text) => process.stdout.write(text)
  })
  .then((full) => {
    process.stdout.write(`\n--- 流式输出结束（共 ${full.length} 字） ---\n`)
  })
  .catch((error) => {
    console.error('\n[AIError]', error)
    process.exitCode = 1
  })
