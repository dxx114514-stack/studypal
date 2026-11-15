import { marked } from 'marked'
import katex from 'katex'

const MATH_PATTERN = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\))/g
const PLACEHOLDER = '\u0000MATH'

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function isSafeUrl(url: string): boolean {
  const value = url.trim()
  if (!value) return false
  return !/^(javascript|data|vbscript):/i.test(value)
}

const renderer = {
  html(token: { text?: string; raw?: string }): string {
    return escapeHtml(token?.text ?? token?.raw ?? '')
  },
  link(token: { href?: string; text?: string }): string {
    const href = token?.href ?? ''
    const text = escapeHtml(token?.text ?? href)
    if (!isSafeUrl(href)) return text
    return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${text}</a>`
  }
}

marked.use({ renderer: renderer as never, gfm: true, breaks: true })

/**
 * Markdown + LaTeX 渲染：
 * 先把公式替换为占位符，避免 marked 把 $x_1$ 中的下划线解析成强调，
 * 再交给 KaTeX 渲染。
 */
export function renderMarkdown(text: string): string {
  if (!text) return ''

  const formulas: string[] = []
  const protectedText = text.replace(MATH_PATTERN, (match) => {
    formulas.push(match)
    return `${PLACEHOLDER}${formulas.length - 1}\u0000`
  })

  let html = marked.parse(protectedText) as string
  html = html.replace(/\u0000MATH(\d+)\u0000/g, (_match, index: string) => renderFormula(formulas[Number(index)]))
  return html
}

function renderFormula(raw: string): string {
  const display =
    raw.startsWith('$$') || raw.startsWith('\\[')
  const body = raw.startsWith('$$')
    ? raw.slice(2, -2)
    : raw.startsWith('$')
      ? raw.slice(1, -1)
      : raw.slice(2, -2)

  try {
    return katex.renderToString(body.trim(), {
      displayMode: display,
      throwOnError: false,
      strict: false,
      output: 'html'
    })
  } catch {
    return escapeHtml(raw)
  }
}
