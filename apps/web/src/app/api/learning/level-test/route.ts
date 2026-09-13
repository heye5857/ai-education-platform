import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { levelIdSchema } from '@/lib/validations/schemas'

function shuffle<T>(items: T[]): T[] {
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/**
 * GET /api/learning/level-test?levelId=
 * Level 測驗組卷：依 LevelQuestion 範圍隨機抽題，排除近 3 次已考題目，不下發答案與解析
 * （題數/通過分數取自 Level 設定快照進 Assessment.config；TBD-03 定案後可調）
 */
export async function GET(request: NextRequest) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json(
      { code: 'UNAUTHORIZED', message: '請先登入' },
      { status: 401 }
    )
  }

  const levelId = request.nextUrl.searchParams.get('levelId')
  if (!levelIdSchema.safeParse(levelId).success) {
    return NextResponse.json(
      { code: 'VALIDATION_ERROR', message: '無效的 Level ID' },
      { status: 400 }
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

  const level = await prisma.level.findUnique({
    where: { id: levelId as string },
  })
  if (!level || !level.isActive) {
    return NextResponse.json(
      { code: 'LEVEL_NOT_FOUND', message: '找不到此關卡' },
      { status: 404 }
    )
  }

  // 測驗卷：每關一份 LEVEL_TEST Assessment（參數快照，避免追溯影響歷史成績）
  let assessment = await prisma.assessment.findFirst({
    where: { type: 'LEVEL_TEST', levelId: level.id, isActive: true },
    orderBy: { id: 'asc' },
  })
  if (!assessment) {
    assessment = await prisma.assessment.create({
      data: {
        type: 'LEVEL_TEST',
        levelId: level.id,
        name: `${level.name} Level 測驗`,
        config: { questionCount: level.questionCount, passScore: level.passScore },
        isActive: true,
      },
    })
  }
  const config =
    assessment.config && typeof assessment.config === 'object' && !Array.isArray(assessment.config)
      ? (assessment.config as Record<string, unknown>)
      : {}
  const questionCount =
    typeof config.questionCount === 'number' ? config.questionCount : level.questionCount
  const passScore = typeof config.passScore === 'number' ? config.passScore : level.passScore

  // 題庫池：此關 LevelQuestion 連結的題目
  const links = await prisma.levelQuestion.findMany({
    where: { levelId: level.id },
    include: { question: true },
    orderBy: { sortOrder: 'asc' },
  })
  if (links.length === 0) {
    return NextResponse.json(
      { code: 'EMPTY_POOL', message: '此關卡尚無測驗題目' },
      { status: 404 }
    )
  }

  // DEC-012：排除近 3 次已考題目（都排除光則退回全池，避免無卷可考）
  const recentAttempts = await prisma.assessmentAttempt.findMany({
    where: { assessmentId: assessment.id, studentId: student.id, completedAt: { not: null } },
    orderBy: { completedAt: 'desc' },
    take: 3,
    include: { questionAttempts: { select: { questionId: true } } },
  })
  const recentIds = new Set(recentAttempts.flatMap((a) => a.questionAttempts.map((q) => q.questionId)))
  const freshPool = links.filter((l) => !recentIds.has(l.question.id))
  const pool = freshPool.length > 0 ? freshPool : links

  const sampled = shuffle(pool).slice(0, Math.min(questionCount, pool.length))

  return NextResponse.json(
    {
      assessmentId: assessment.id,
      levelId: level.id,
      questionCount: sampled.length,
      passScore,
      attemptNumber: recentAttempts.length + 1,
      // 不下發 answer / solutionSteps（防看原始碼作弊）
      questions: sampled.map((l) => ({
        id: l.question.id,
        type: l.question.type,
        stem: l.question.stem,
        options: l.question.options,
        difficulty: l.question.difficulty,
      })),
    },
    { status: 200 }
  )
}