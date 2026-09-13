import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

function shuffle<T>(items: T[]): T[] {
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

// TBD-01 未定案前的預設值：全年級混合抽 10 題
const DEFAULT_QUESTION_COUNT = 10

/**
 * GET /api/assessments/initial?grade=
 * 初始能力測驗組卷：依年級跨單元抽題，題目清單快照進 Assessment.config
 * （供 submit 作答範圍驗證；學生畫像寫入為 Phase 6 工作）
 */
export async function GET(request: NextRequest) {
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

  const gradeParam = request.nextUrl.searchParams.get('grade')
  const grade = gradeParam !== null ? Number.parseInt(gradeParam, 10) : student.grade
  if (!Number.isInteger(grade) || grade < 1 || grade > 12) {
    return NextResponse.json(
      { code: 'VALIDATION_ERROR', message: '年級參數無效' },
      { status: 400 }
    )
  }

  // 同年級既有 INITIAL 卷沿用（題目快照一致），否則新建
  let assessment = await prisma.assessment.findFirst({
    where: {
      type: 'INITIAL',
      isActive: true,
      config: { path: ['grade'], equals: grade },
    },
    orderBy: { id: 'asc' },
  })

  let questionIds: string[]
  if (assessment) {
    const config =
      assessment.config && typeof assessment.config === 'object' && !Array.isArray(assessment.config)
        ? (assessment.config as Record<string, unknown>)
        : {}
    questionIds = Array.isArray(config.questionIds)
      ? config.questionIds.filter((v): v is string => typeof v === 'string')
      : []
  } else {
    const pool = await prisma.question.findMany({
      where: { gradeLevel: grade },
      select: { id: true },
    })
    if (pool.length === 0) {
      return NextResponse.json(
        { code: 'EMPTY_POOL', message: '此年級尚無測驗題目' },
        { status: 404 }
      )
    }
    questionIds = shuffle(pool.map((q) => q.id)).slice(
      0,
      Math.min(DEFAULT_QUESTION_COUNT, pool.length)
    )
    assessment = await prisma.assessment.create({
      data: {
        type: 'INITIAL',
        name: `新生初始能力測驗（${grade}年級）`,
        config: { grade, questionCount: questionIds.length, questionIds },
        isActive: true,
      },
    })
  }

  const questions = await prisma.question.findMany({
    where: { id: { in: questionIds } },
  })
  // 依快照順序還原
  const order = new Map(questionIds.map((id, i) => [id, i]))
  questions.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))

  const completedCount = await prisma.assessmentAttempt.count({
    where: { assessmentId: assessment.id, studentId: student.id, completedAt: { not: null } },
  })

  return NextResponse.json(
    {
      assessmentId: assessment.id,
      grade,
      questionCount: questions.length,
      attemptNumber: completedCount + 1,
      questions: questions.map((q) => ({
        id: q.id,
        type: q.type,
        stem: q.stem,
        options: q.options,
        difficulty: q.difficulty,
      })),
    },
    { status: 200 }
  )
}