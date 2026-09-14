import { describe, it, expect } from 'vitest'
import { getTeachingSystemPrompt } from './prompt'

describe('getTeachingSystemPrompt', () => {
  it('包含硬約束、學生姓名、年級適應與弱項', () => {
    const prompt = getTeachingSystemPrompt({
      studentName: '小明',
      grade: 7,
      weakKPs: [{ code: 'TRANSPOSITION', name: '移項', masteryScore: 32 }],
      recentWrongCount: 3,
    })
    expect(prompt).toContain('小明')
    expect(prompt).toContain('國一')
    expect(prompt).toContain('絕不直接給最終答案')
    expect(prompt).toContain('TRANSPOSITION')
    expect(prompt).toContain('待複習 3 題')
    expect(prompt).toContain('繁體中文')
  })
})