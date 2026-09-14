import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

/**
 * GET /api/student/analysis
 * 學習分析儀表板：總覽統計 + 各領域掌握度 + 弱項/強項排行 + 近 7 天作答趨勢
 */
export async function GET() {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json(
      { code: 'UNAUTHORIZED', message: '請先登入' },
      { status: 401 }
    )
  }

  const student = await prisma.student.findUnique({
    where: { userId: session.user.id },
  })
  if (!student) {
    return NextResponse.json(
      { code: 'STUDENT_NOT_FOUND', message: '尚未建立學生檔案，請先完成新手引導' },
      { status: 404 }
    )
  }

  const [
    masteryRows,
    wrongRows,
    conversationsActive,
    levelsCompleted,
    recentAttempts,
  ] = await Promise.all([
    prisma.studentKnowledgePoint.findMany({
      where: { studentId: student.id },
      include: {
        knowledgePoint: { select: { code: true, name: true, topic: true, domain: true } },
      },
    }),
    prisma.wrongQuestion.findMany({
      where: { studentId: student.id, reviewStatus: { in: ['NEW', 'REVIEWING'] } },
      include: {
        question: {
          select: {
            knowledgePoints: {
              select: { knowledgePoint: { select: { domain: true } } },
            },
          },
        },
      },
    }),
    prisma.conversation.count({
      where: { studentId: student.id, status: 'ACTIVE' },
    }),
    prisma.learningProgress.count({
      where: { studentId: student.id, status: { in: ['COMPLETED', 'MASTERED'] } },
    }),
    prisma.questionAttempt.findMany({
      where: {
        studentId: student.id,
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 3600 * 1000) },
      },
      select: { isCorrect: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
      take: 1000,
    }),
  ])

  // 各領域掌握度
  const byDomain = new Map<string, { total: number; count: number }>()
  for (const row of masteryRows) {
    const d = row.knowledgePoint.domain
    const cur = byDomain.get(d) ?? { total: 0, count: 0 }
    cur.total += row.masteryScore
    cur.count++
    byDomain.set(d, cur)
  }
  const domainMastery = [...byDomain.entries()]
    .map(([domain, v]) => ({
      domain,
      avg: Math.round((v.total / v.count) * 10) / 10,
      count: v.count,
    }))
    .sort((a, b) => a.avg - b.avg)

  // 弱項 / 強項（有作答紀錄者優先排序）
  const ranked = [...masteryRows].sort((a, b) => a.masteryScore - b.masteryScore)
  const weak = ranked.slice(0, 5).map((r) => ({
    code: r.knowledgePoint.code,
    name: r.knowledgePoint.name,
    topic: r.knowledgePoint.topic,
    masteryScore: r.masteryScore,
    attemptCount: r.attemptCount,
  }))
  const strong = [...ranked]
    .reverse()
    .slice(0, 5)
    .map((r) => ({
      code: r.knowledgePoint.code,
      name: r.knowledgePoint.name,
      topic: r.knowledgePoint.topic,
      masteryScore: r.masteryScore,
      attemptCount: r.attemptCount,
    }))

  // 錯誤領域分布
  const errorByDomain = new Map<string, number>()
  for (const w of wrongRows) {
    for (const kp of w.question.knowledgePoints) {
      const d = kp.knowledgePoint.domain
      errorByDomain.set(d, (errorByDomain.get(d) ?? 0) + 1)
    }
  }

  // 近 7 天趨勢（以台灣時區日期分桶顯示，後端按 UTC 日切分，前端僅顯示）
  const trendMap = new Map<string, { total: number; correct: number }>()
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 3600 * 1000)
    trendMap.set(d.toISOString().slice(0, 10), { total: 0, correct: 0 })
  }
  for (const a of recentAttempts) {
    const key = a.createdAt.toISOString().slice(0, 10)
    const bucket = trendMap.get(key)
    if (bucket) {
      bucket.total++
      if (a.isCorrect) bucket.correct++
    }
  }
  const trend = [...trendMap.entries()].map(([date, v]) => ({ date, ...v }))

  const totalAttempts = masteryRows.reduce((s, r) => s + r.attemptCount, 0)
  const totalCorrect = masteryRows.reduce((s, r) => s + r.correctCount, 0)

  return NextResponse.json(
    {
      overview: {
        totalAttempts,
        accuracy: totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0,
        wrongPending: wrongRows.length,
        conversationsActive,
        levelsCompleted,
        knowledgePointsTracked: masteryRows.length,
      },
      domainMastery,
      weak,
      strong,
      errorByDomain: [...errorByDomain.entries()].map(([domain, count]) => ({ domain, count })),
      trend,
    },
    { status: 200 }
  )
}