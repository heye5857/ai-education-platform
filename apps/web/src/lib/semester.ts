/**
 * 學期判斷邏輯（對應 obsidian-vault 學生系統規格）
 * 上學期：每年 8 月至次年 1 月 → 1
 * 下學期：每年 2 月至 7 月 → 2
 */

export type SemesterValue = 1 | 2

export function getSemesterForDate(date: Date): SemesterValue {
  const month = date.getMonth() + 1 // 1-12
  if (month >= 8 || month <= 1) return 1
  return 2
}

export function getCurrentSemester(now: Date = new Date()): SemesterValue {
  return getSemesterForDate(now)
}

const GRADE_LABELS: Record<number, string> = {
  7: '國一',
  8: '國二',
  9: '國三',
  10: '高一',
  11: '高二',
  12: '高三',
}

export function getGradeLabel(grade: number): string {
  return GRADE_LABELS[grade] ?? `${grade}年級`
}

export interface GradeOption {
  value: number
  label: string
}

export interface SemesterOption {
  value: SemesterValue
  label: string
}

export const GRADES: GradeOption[] = [
  { value: 7, label: '國一 (7年級)' },
  { value: 8, label: '國二 (8年級)' },
  { value: 9, label: '國三 (9年級)' },
  { value: 10, label: '高一 (10年級)' },
  { value: 11, label: '高二 (11年級)' },
  { value: 12, label: '高三 (12年級)' },
]

export const SEMESTERS: SemesterOption[] = [
  { value: 1, label: '上學期 (8月-1月)' },
  { value: 2, label: '下學期 (2月-7月)' },
]