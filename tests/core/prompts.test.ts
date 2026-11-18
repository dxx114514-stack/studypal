import { describe, expect, it } from 'vitest'
import { basePersona } from '../../core/prompts/base'

const persona = basePersona({ stage: 'senior', subject: 'math' })

describe('basePersona 身份设定', () => {
  it('使用完整产品名', () => {
    expect(persona).toContain("dxx's StudyPal")
  })

  it('明确 dxx 不是名字，禁止自称 DXX', () => {
    expect(persona).toContain('不是人名')
    expect(persona).toContain('禁止把自己称为 DXX')
  })

  it('不再出现旧的所有格式导师表述', () => {
    expect(persona).not.toContain("StudyPal 的 AI 学习导师")
    expect(persona).not.toContain("dxx's StudyPal 的")
  })

  it('带上当前学段与学科', () => {
    expect(persona).toContain('高中')
    expect(persona).toContain('数学')
  })
})
