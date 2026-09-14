import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { wrongQuestionListQuerySchema } from '@/lib/validations/schemas'

/**
 * GET /api/student/wrong-questions?status=&search=&sort=&page=&limit=
 * 錯題本列表（篩選狀態/關鍵字搜尋/排序/分頁，不含答案與解析）
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

  const raw = Object.fromEntries(request.nextUrl.searchParams.entries())
  const parsed = wrongQuestionListQuerySchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      {
        code: 'VALIDATION_ERROR',
        message: '查詢參數無效',
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    )
  }

  const { status, search, sort, page, limit } = parsed.data
  const orderBy =
    sort === 'errors'
      ? { errorCount: 'desc' as const }
      : sort === 'review'
        ? [{ nextReviewAt: 'asc' as const }, { lastErrorAt: 'desc' as const }]
        : { lastErrorAt: 'desc' as const }

  const where = {
    studentId: student.id,
    ...(status ? { reviewStatus: status } : {}),
    ...(search
      ? { question: { stem: { contains: search, mode: 'insensitive' as const } } }
      : {}),
  }

  const [total, items, dueCount] = await Promise.all([
    prisma.wrongQuestion.count({ where }),
    prisma.wrongQuestion.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        question: {
          select: {
            id: true,
            type: true,
            stem: true,
            difficulty: true,
            gradeLevel: true,
            knowledgePoints: {
              select: { knowledgePoint: { select: { code: true, name: true } } },
            },
          },
        },
      },
    }),
    prisma.wrongQuestion.count({
      where: {
        studentId: student.id,
        reviewStatus: { in: ['NEW', 'REVIEWING'] },
        OR: [{ nextReviewAt: null }, { nextReviewAt: { lte: new Date() } }],
      },
    }),
  ])

  return NextResponse.json(
    {
      items: items.map((w) => ({
        id: w.id,
        questionId: w.questionId,
        errorCount: w.errorCount,
        firstErrorAt: w.firstErrorAt,
        lastErrorAt: w.lastErrorAt,
        reviewStatus: w.reviewStatus,
        reviewCount: w.reviewCount,
        nextReviewAt: w.nextReviewAt,
        question: {
          ...w.question,
          knowledgePoints: w.question.knowledgePoints.map((k) => k.knowledgePoint),
        },
      })),
      total,
      page,
      limit,
      dueCount,
    },
    { status: 200 }
  )
}