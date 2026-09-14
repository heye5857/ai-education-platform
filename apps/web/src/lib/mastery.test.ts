import { describe, it, expect } from 'vitest'
import { calculateMastery, type MasteryAttemptInput } from './mastery'

const NOW = new Date('2026-09-13T00:00:00Z')
const day = 24 * 3600 * 1000
const base: MasteryAttemptInput = {
  isCorrect: true,
  hintsUsed: 0,
  timeSpentSeconds: 60,
  difficulty: 3,
  createdAt: new Date(NOW.getTime() - day),
}

describe('calculateMastery（TBD-02 推薦 MVP 綜合評分模型）', () => {
  it('無作答時回傳先驗中性分（需呼叫端決定是否寫入）', () => {
    const r = calculateMastery([], NOW)
    expect(r.masteryScore).toBe(50)
    expect(r.confidence).toBe(0)
  })

  it('全對高於全錯，且都在 0-100 內', () => {
    const good = calculateMastery(
      [base, base, base, base, base].map((a) => ({ ...a })),
      NOW
    )
    const bad = calculateMastery(
      [base, base, base, base, base].map((a) => ({ ...a, isCorrect: false })),
      NOW
    )
    expect(good.masteryScore).toBeGreaterThan(bad.masteryScore)
    expect(good.masteryScore).toBeLessThanOrEqual(100)
    expect(bad.masteryScore).toBeGreaterThanOrEqual(0)
  })

  it('近期作答權重大於久遠作答（30 天衰減）', () => {
    const recent = calculateMastery(
      [
        { ...base, isCorrect: false, createdAt: new Date(NOW.getTime() - 60 * day) },
        { ...base, isCorrect: true, createdAt: new Date(NOW.getTime() - day) },
      ],
      NOW
    )
    const old = calculateMastery(
      [
        { ...base, isCorrect: true, createdAt: new Date(NOW.getTime() - 60 * day) },
        { ...base, isCorrect: false, createdAt: new Date(NOW.getTime() - day) },
      ],
      NOW
    )
    expect(recent.masteryScore).toBeGreaterThan(old.masteryScore)
  })

  it('提示使用會扣分（每提示 -15% 權重）', () => {
    const noHint = calculateMastery([{ ...base }], NOW)
    const hinted = calculateMastery([{ ...base, hintsUsed: 2 }], NOW)
    expect(noHint.masteryScore).toBeGreaterThan(hinted.masteryScore)
  })

  it('難題答對加權高於簡單題', () => {
    const hard = calculateMastery([{ ...base, difficulty: 5 }], NOW)
    const easy = calculateMastery([{ ...base, difficulty: 1 }], NOW)
    expect(hard.masteryScore).toBeGreaterThan(easy.masteryScore)
  })

  it('樣本越多信心度越高（上限 1）', () => {
    const few = calculateMastery([{ ...base }], NOW)
    const many = calculateMastery(Array.from({ length: 30 }, () => ({ ...base })), NOW)
    expect(many.confidence).toBeGreaterThan(few.confidence)
    expect(many.confidence).toBeLessThanOrEqual(1)
  })
})