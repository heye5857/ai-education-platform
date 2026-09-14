import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { wrongQuestionStatusSchema } from '@/lib/validations/schemas'

async function getOwnedWrongQuestion(userId: string | undefined, id: string) {
  if (!userId) return { error: 'UNAUTHORIZED' as const, wrong: null }
  const student = await prisma.student.findUnique({ where: { userId } })
  if (!student) return { error: 'STUDENT_NOT_FOUND' as const, wrong: null }
  const wrong = await prisma.wrongQuestion.findFirst({
    where: { id, studentId: student.id },
  })
  if (!wrong) return { error: 'NOT_FOUND' as const, wrong: null }
  return { error: null, wrong, student }
}

/**
 * GET /api/student/wrong-questions/[id]
 * 錯題詳情：完整題目（含答案解析）＋最近作答歷程＋統計
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  const { error, wrong } = await getOwnedWrongQuestion(session?.user?.id, params.id)

  if (error === 'UNAUTHORIZED') {
    return NextResponse.json({ code: 'UNAUTHORIZED', message: '請先登入' }, { status: 401 })
  }
  if (error === 'STUDENT_NOT_FOUND') {
    return NextResponse.json(
      { code: 'STUDENT_NOT_FOUND', message: '尚未建立學生檔案' },
      { status: 404 }
    )
  }
  if (error === 'NOT_FOUND' || !wrong) {
    return NextResponse.json({ code: 'NOT_FOUND', message: '找不到此錯題' }, { status: 404 })
  }

  const [question, attempts] = await Promise.all([
    prisma.question.findUnique({
      where: { id: wrong.questionId },
      include: {
        knowledgePoints: {
          select: { knowledgePoint: { select: { code: true, name: true, topic: true } } },
        },
      },
    }),
    prisma.questionAttempt.findMany({
      where: { studentId: wrong.studentId, questionId: wrong.questionId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        studentAnswer: true,
        isCorrect: true,
        attemptNumber: true,
        hintsUsed: true,
        timeSpentSeconds: true,
        createdAt: true,
      },
    }),
  ])

  if (!question) {
    return NextResponse.json({ code: 'NOT_FOUND', message: '題目已不存在' }, { status: 404 })
  }

  return NextResponse.json(
    {
      wrong,
      question: {
        ...question,
        knowledgePoints: question.knowledgePoints.map((k) => k.knowledgePoint),
      },
      attempts,
    },
    { status: 200 }
  )
}

/**
 * PATCH /api/student/wrong-questions/[id] { reviewStatus }
 * 手動變更狀態：重啟複習 / 標記已掌握 / 歸檔
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  const { error, wrong } = await getOwnedWrongQuestion(session?.user?.id, params.id)

  if (error === 'UNAUTHORIZED') {
    return NextResponse.json({ code: 'UNAUTHORIZED', message: '請先登入' }, { status: 401 })
  }
  if (error === 'STUDENT_NOT_FOUND') {
    return NextResponse.json(
      { code: 'STUDENT_NOT_FOUND', message: '尚未建立學生檔案' },
      { status: 404 }
    )
  }
  if (error === 'NOT_FOUND' || !wrong) {
    return NextResponse.json({ code: 'NOT_FOUND', message: '找不到此錯題' }, { status: 404 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ code: 'INVALID_JSON', message: '請求格式錯誤' }, { status: 400 })
  }

  const parsed = wrongQuestionStatusSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        code: 'VALIDATION_ERROR',
        message: '狀態值無效',
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    )
  }

  const updated = await prisma.wrongQuestion.update({
    where: { id: wrong.id },
    data: {
      reviewStatus: parsed.data.reviewStatus,
      // 已掌握/歸檔後不再排程；重啟複習則排明天
      nextReviewAt:
        parsed.data.reviewStatus === 'REVIEWING'
          ? new Date(Date.now() + 24 * 3600 * 1000)
          : null,
    },
  })

  return NextResponse.json({ wrong: updated }, { status: 200 })
}