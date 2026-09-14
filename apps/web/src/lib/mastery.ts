/**
 * Mastery 掌握度引擎（TBD-02 推薦 MVP：綜合評分模型）
 * 來源：obsidian-vault/02_Features/Mastery System.md
 *
 * - 先驗分數 50、先驗權重 10（中性起點）
 * - 時間衰減：30 天半衰期指數衰減
 * - 難度加權：1 + (difficulty - 3) * 0.1
 * - 提示懲罰：每次提示 -15% 權重
 * - 快速作答加成：<30 秒 1.1x
 * - 部分分：errorAnalysis 有步驟級回饋時按比例給分（目前作答無步驟資料，預設 0）
 * - 信心度：min(1, n/20) × 一致性；一致性規格未定義，此處採多數派比例映射
 *   consistency = 0.5 + 0.5 * |2r - 1|（r 為答對率；全對/全錯→1，平分秋色→0.5）
 */
import { prisma } from '@/lib/db'

export interface MasteryAttemptInput {
  isCorrect: boolean
  hintsUsed: number
  timeSpentSeconds: number
  difficulty: number
  createdAt: Date
  /** 步驟級部分分比例（0-1），無資料時忽略 */
  partialRatio?: number
}

export interface MasteryResult {
  masteryScore: number
  confidence: number
}

const PRIOR_SCORE = 50
const PRIOR_WEIGHT = 10
const HALF_LIFE_MS = 30 * 24 * 3600 * 1000

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v))
}

export function calculateMastery(
  attempts: MasteryAttemptInput[],
  now: Date = new Date()
): MasteryResult {
  if (attempts.length === 0) {
    return { masteryScore: PRIOR_SCORE, confidence: 0 }
  }

  let weightedSum = 0
  let totalWeight = 0
  let correct = 0

  for (const a of attempts) {
    if (a.isCorrect) correct++
    const ageMs = Math.max(0, now.getTime() - a.createdAt.getTime())
    const timeDecay = Math.exp(-ageMs / HALF_LIFE_MS)
    const difficultyWeight = 1 + (a.difficulty - 3) * 0.1
    const hintPenalty = Math.max(0, 1 - a.hintsUsed * 0.15)
    const speedBonus = a.timeSpentSeconds < 30 ? 1.1 : 1.0
    const weight = timeDecay * difficultyWeight * hintPenalty * speedBonus

    let points = a.isCorrect ? 100 : 0
    if (!a.isCorrect && a.partialRatio !== undefined) {
      points = clamp(a.partialRatio, 0, 1) * 50
    }

    weightedSum += points * weight
    totalWeight += weight
  }

  const masteryScore = clamp(
    (weightedSum + PRIOR_SCORE * PRIOR_WEIGHT) / (totalWeight + PRIOR_WEIGHT),
    0,
    100
  )

  const rate = correct / attempts.length
  const consistency = 0.5 + 0.5 * Math.abs(2 * rate - 1)
  const confidence = clamp(Math.min(1, attempts.length / 20) * consistency, 0, 1)

  return {
    masteryScore: Math.round(masteryScore * 10) / 10,
    confidence: Math.round(confidence * 100) / 100,
  }
}

/**
 * 為指定題目涉及的 KPs 重算 Mastery（QuestionAttempt 新增後呼叫）
 * best-effort：失敗由呼叫端記錄，不阻擋主流程
 */
export async function recomputeMasteryForQuestions(
  studentId: string,
  questionIds: string[]
): Promise<void> {
  if (questionIds.length === 0) return

  const links = await prisma.questionKnowledgePoint.findMany({
    where: { questionId: { in: questionIds } },
    select: { knowledgePointId: true },
  })
  const kpIds = [...new Set(links.map((l) => l.knowledgePointId))]
  if (kpIds.length === 0) return

  for (const kpId of kpIds) {
    const attempts = await prisma.questionAttempt.findMany({
      where: {
        studentId,
        question: { knowledgePoints: { some: { knowledgePointId: kpId } } },
      },
      include: { question: { select: { difficulty: true } } },
      orderBy: { createdAt: 'asc' },
    })
    if (attempts.length === 0) continue

    const { masteryScore, confidence } = calculateMastery(
      attempts.map((a) => ({
        isCorrect: a.isCorrect,
        hintsUsed: a.hintsUsed,
        timeSpentSeconds: a.timeSpentSeconds,
        difficulty: a.question.difficulty,
        createdAt: a.createdAt,
      }))
    )
    const correctCount = attempts.filter((a) => a.isCorrect).length
    const last = attempts[attempts.length - 1]

    await prisma.studentKnowledgePoint.upsert({
      where: { studentId_knowledgePointId: { studentId, knowledgePointId: kpId } },
      create: {
        studentId,
        knowledgePointId: kpId,
        masteryScore,
        confidence,
        attemptCount: attempts.length,
        correctCount,
        lastAttemptAt: last.createdAt,
      },
      update: {
        masteryScore,
        confidence,
        attemptCount: attempts.length,
        correctCount,
        lastAttemptAt: last.createdAt,
      },
    })
  }
}