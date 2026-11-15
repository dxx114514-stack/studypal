export type AIErrorCode =
  | 'INVALID_API_KEY'
  | 'NETWORK_TIMEOUT'
  | 'NETWORK_ERROR'
  | 'MODEL_NO_VISION'
  | 'MODEL_NO_STREAM'
  | 'JSON_PARSE_FAILED'
  | 'STORAGE_WRITE_FAILED'
  | 'RATE_LIMIT'
  | 'PROVIDER_ERROR'
  | 'ABORTED'
  | 'UNKNOWN'

export interface AIErrorInfo {
  title: string
  hint: string
}

/** 面向用户的中文提示，UI 直接展示 */
export const AI_ERROR_INFO: Record<AIErrorCode, AIErrorInfo> = {
  INVALID_API_KEY: {
    title: 'API Key 无效或已过期',
    hint: '请到设置页检查 Key 是否填写正确、是否与 Base URL / 模型匹配。'
  },
  NETWORK_TIMEOUT: {
    title: '网络超时',
    hint: '请检查网络或本地模型是否已启动，也可以稍后重试。'
  },
  NETWORK_ERROR: {
    title: '网络请求失败',
    hint: '可能是网络不可达、CORS 限制或 Base URL 错误；桌面端可尝试开启“本地代理”。'
  },
  MODEL_NO_VISION: {
    title: '当前模型不支持图片输入',
    hint: '请切换到多模态模型（如 gpt-4o、qwen-vl-max、gemini-flash），或在设置中关闭该模型的图片能力。'
  },
  MODEL_NO_STREAM: {
    title: '当前模型不支持流式输出',
    hint: '已自动降级为整段返回；如需逐字输出请更换支持 stream 的模型。'
  },
  JSON_PARSE_FAILED: {
    title: '模型返回格式无法解析',
    hint: '可重试一次，或更换模型；复习卡片/导图类功能要求模型严格输出 JSON 或 Markdown。'
  },
  STORAGE_WRITE_FAILED: {
    title: '本地存储写入失败',
    hint: '可能是存储空间已满或浏览器/系统禁止写入，请清理空间后重试。'
  },
  RATE_LIMIT: {
    title: '请求过于频繁或额度不足',
    hint: '请稍后重试，或检查该 API Key 的额度与限流设置。'
  },
  PROVIDER_ERROR: {
    title: '模型服务返回错误',
    hint: '请检查 Base URL、模型名称与账户状态。'
  },
  ABORTED: {
    title: '请求已取消',
    hint: '已停止生成。'
  },
  UNKNOWN: {
    title: '发生未知错误',
    hint: '请重试，若持续出现可查看控制台日志。'
  }
}

interface AIErrorOptions {
  message?: string
  status?: number
  retryable?: boolean
  detail?: string
  cause?: unknown
}

export class AIError extends Error {
  readonly code: AIErrorCode
  readonly status?: number
  readonly retryable: boolean
  readonly detail?: string

  constructor(code: AIErrorCode, options: AIErrorOptions = {}) {
    super(options.message ?? AI_ERROR_INFO[code].title, { cause: options.cause })
    this.name = 'AIError'
    this.code = code
    this.status = options.status
    this.retryable = options.retryable ?? false
    this.detail = options.detail
  }

  get title(): string {
    return AI_ERROR_INFO[this.code].title
  }

  get hint(): string {
    return AI_ERROR_INFO[this.code].hint
  }

  toJSON(): { code: AIErrorCode; title: string; message: string; hint: string; status?: number } {
    return {
      code: this.code,
      title: this.title,
      message: this.message,
      hint: this.hint,
      status: this.status
    }
  }
}

export class TimeoutError extends Error {
  constructor(message = '请求超时') {
    super(message)
    this.name = 'TimeoutError'
  }
}

export function mapHttpStatus(status: number, bodyText: string): AIError {
  const detail = bodyText.slice(0, 400)
  if (status === 401 || status === 403) {
    return new AIError('INVALID_API_KEY', { status, detail, retryable: false })
  }
  if (status === 404) {
    return new AIError('PROVIDER_ERROR', {
      status,
      detail,
      message: '接口地址或模型不存在（404）',
      retryable: false
    })
  }
  if (status === 408 || status === 504) {
    return new AIError('NETWORK_TIMEOUT', { status, detail, retryable: true })
  }
  if (status === 429) {
    return new AIError('RATE_LIMIT', { status, detail, retryable: true })
  }
  if (status >= 500) {
    return new AIError('PROVIDER_ERROR', { status, detail, retryable: true })
  }
  return new AIError('PROVIDER_ERROR', { status, detail, retryable: false })
}

export function toAIError(error: unknown): AIError {
  if (error instanceof AIError) return error
  if (error instanceof TimeoutError) {
    return new AIError('NETWORK_TIMEOUT', { cause: error })
  }
  if (error instanceof Error) {
    if (error.name === 'AbortError') {
      return new AIError('ABORTED', { cause: error })
    }
    if (error.name === 'TimeoutError') {
      return new AIError('NETWORK_TIMEOUT', { cause: error })
    }
    const message = error.message || '未知错误'
    if (/failed to fetch|network|fetch failed|ENOTFOUND|ECONNREFUSED/i.test(message)) {
      return new AIError('NETWORK_ERROR', { message: '网络连接失败', detail: message, retryable: true, cause: error })
    }
    return new AIError('UNKNOWN', { message, detail: message, cause: error })
  }
  return new AIError('UNKNOWN', { cause: error })
}
