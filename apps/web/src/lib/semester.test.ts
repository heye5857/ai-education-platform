import { describe, it, expect } from 'vitest'
import { getSemesterForDate, getGradeLabel, GRADES, SEMESTERS } from './semester'

describe('getSemesterForDate', () => {
  it('上學期：8 月回傳 1', () => {
    expect(getSemesterForDate(new Date(2026, 7, 15))).toBe(1)
  })

  it('上學期：1 月回傳 1', () => {
    expect(getSemesterForDate(new Date(2027, 0, 10))).toBe(1)
  })

  it('下學期：2 月回傳 2', () => {
    expect(getSemesterForDate(new Date(2027, 1, 1))).toBe(2)
  })

  it('下學期：7 月回傳 2', () => {
    expect(getSemesterForDate(new Date(2027, 6, 31))).toBe(2)
  })

  it('邊界：8 月 1 日回傳 1，7 月 31 日回傳 2', () => {
    expect(getSemesterForDate(new Date(2026, 7, 1))).toBe(1)
    expect(getSemesterForDate(new Date(2027, 6, 31))).toBe(2)
  })
})

describe('getGradeLabel', () => {
  it('7→國一、9→國三、10→高一、12→高三', () => {
    expect(getGradeLabel(7)).toBe('國一')
    expect(getGradeLabel(9)).toBe('國三')
    expect(getGradeLabel(10)).toBe('高一')
    expect(getGradeLabel(12)).toBe('高三')
  })
})

describe('GRADES / SEMESTERS 常數', () => {
  it('GRADES 涵蓋國一到高三共 6 個年級', () => {
    expect(GRADES).toHaveLength(6)
    expect(GRADES[0]).toEqual({ value: 7, label: expect.stringContaining('國一') })
    expect(GRADES[5]).toEqual({ value: 12, label: expect.stringContaining('高三') })
  })

  it('SEMESTERS 有上/下學期共 2 個', () => {
    expect(SEMESTERS).toHaveLength(2)
    expect(SEMESTERS.map((s) => s.value).sort()).toEqual([1, 2])
  })
})