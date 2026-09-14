/**
 * 共用批改邏輯（測驗 submit、卡片作答、錯題複習共用）
 * - SINGLE_CHOICE：選項 id 精確比對
 * - MULTIPLE_CHOICE：選項 id 集合相等（順序無關，JSON 陣列字串）
 * - FILL_BLANK / SHORT_ANSWER：去空白小寫正規化比對
 * - PROOF 等：不自動判分（gradable=false，需人工批改）
 */

export function normalizeAnswer(value: string): string {
  return value.replace(/\s+/g, '').toLowerCase()
}

function parseIdSet(raw: string): string[] | null {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return null
    return parsed.filter((v): v is string => typeof v === 'string').sort()
  } catch {
    return null
  }
}

export function gradeAnswer(
  type: string,
  studentAnswer: string,
  correctAnswer: string
): { isCorrect: boolean; gradable: boolean } {
  switch (type) {
    case 'SINGLE_CHOICE':
      return { isCorrect: studentAnswer.trim() === correctAnswer.trim(), gradable: true }
    case 'MULTIPLE_CHOICE': {
      const a = parseIdSet(studentAnswer)
      const b = parseIdSet(correctAnswer)
      if (!a || !b) return { isCorrect: false, gradable: true }
      return {
        isCorrect: a.length === b.length && a.every((v, i) => v === b[i]),
        gradable: true,
      }
    }
    case 'FILL_BLANK':
    case 'SHORT_ANSWER':
      return {
        isCorrect: normalizeAnswer(studentAnswer) === normalizeAnswer(correctAnswer),
        gradable: true,
      }
    default:
      return { isCorrect: false, gradable: false }
  }
}