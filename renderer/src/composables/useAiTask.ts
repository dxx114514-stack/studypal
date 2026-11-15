import { ref } from 'vue'
import { AIError, toAIError } from '@core/ai/errors'

export interface AiTaskContext {
  signal: AbortSignal
  onDelta: (text: string) => void
}

/** 统一的流式任务状态机：输出、运行中、错误、取消 */
export function useAiTask() {
  const output = ref('')
  const running = ref(false)
  const error = ref<AIError | null>(null)
  let controller: AbortController | null = null

  async function run(task: (context: AiTaskContext) => Promise<void>): Promise<void> {
    if (running.value) return
    controller = new AbortController()
    output.value = ''
    error.value = null
    running.value = true
    try {
      await task({
        signal: controller.signal,
        onDelta: (text) => {
          output.value += text
        }
      })
    } catch (caught) {
      error.value = toAIError(caught)
    } finally {
      running.value = false
      controller = null
    }
  }

  function abort(): void {
    controller?.abort()
  }

  function reset(): void {
    output.value = ''
    error.value = null
  }

  return { output, running, error, run, abort, reset }
}
