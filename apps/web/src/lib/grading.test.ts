import { describe, it, expect } from 'vitest'
import { normalizeAnswer, gradeAnswer } from './grading'

describe('normalizeAnswer', () => {
  it('去空白 + 小寫', () => {
    expect(normalizeAnswer('  2X + 6 ')).toBe('2x+6')
  })
})

describe('gradeAnswer', () => {
  it('SINGLE_CHOICE 精確比對選項 id', () => {
    expect(gradeAnswer('SINGLE_CHOICE', 'B', 'B')).toEqual({ isCorrect: true, gradable: true })
    expect(gradeAnswer('SINGLE_CHOICE', 'A', 'B')).toEqual({ isCorrect: false, gradable: true })
  })

  it('MULTIPLE_CHOICE 集合相等（順序無關）', () => {
    expect(gradeAnswer('MULTIPLE_CHOICE', '["B","A"]', '["A","B"]')).toEqual({
      isCorrect: true,
      gradable: true,
    })
    expect(gradeAnswer('MULTIPLE_CHOICE', '["A"]', '["A","B"]')).toEqual({
      isCorrect: false,
      gradable: true,
    })
    expect(gradeAnswer('MULTIPLE_CHOICE', 'not-json', '["A"]')).toEqual({
      isCorrect: false,
      gradable: true,
    })
  })

  it('FILL_BLANK / SHORT_ANSWER 正規化比對', () => {
    expect(gradeAnswer('FILL_BLANK', ' 2 ', '2')).toEqual({ isCorrect: true, gradable: true })
    expect(gradeAnswer('SHORT_ANSWER', '15元', '15')).toEqual({ isCorrect: false, gradable: true })
  })

  it('PROOF 不自動判分', () => {
    expect(gradeAnswer('PROOF', 'anything', 'anything')).toEqual({
      isCorrect: false,
      gradable: false,
    })
  })
})