import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { wrongQuestionAnswerSchema } from '@/lib/validations/schemas'
import { gradeAnswer } from '@/lib/grading'
import type { WrongQuestion } from '@prisma/client'

const DAY_MS = 24 * 3600 * 1000
// TBD-19 未定案前的過渡排程：連對 1 次→隔天，2 次→3 天后，3 次→結業
const REVIEW_INTERVAL_DAYS = [1, 3, 7]
const MASTERED_AFTER_REVIEWS = 3

/**
 * POST /api/student/wrong-questions/[id]/review { answer?, timeSpentSeconds? }
 * 錯題複習作答：批改 → 記 QuestionAttempt → 依對錯更新排程與狀態 → 重算 Mastery
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ code: 'UNAUTHORIZED', message: '請先登入' }, { status: 401 })
  }

  const student = await prisma.student.findUnique({ where: { userId: session.user.id } })
  if (!student) {
    return NextResponse.json(
      { code: 'STUDENT_NOT_FOUND', message: '尚未建立學生檔案' },
      { status: 404 }
    )
  }

  const wrong = await prisma.wrongQuestion.findFirst({
    where: { id: params.id, studentId: student.id },
    include: { question: true },
  })
  if (!wrong) {
    return NextResponse.json({ code: 'NOT_FOUND', message: '找不到此錯題' }, { status: 404 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ code: 'INVALID_JSON', message: '請求格式錯誤' }, { status: 400 })
  }

  const parsed = wrongQuestionAnswerSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        code: 'VALIDATION_ERROR',
        message: '輸入資料驗證失敗',
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    )
  }

  const answer = parsed.data.answer.trim()
  if (answer.length === 0) {
    return NextResponse.json(
      { code: 'ANSWER_REQUIRED', message: '請先輸入答案再送出' },
      { status: 400 }
    )
  }

  const { isCorrect } = gradeAnswer(wrong.question.type, answer, wrong.question.answer)

  const result = await prisma.$transaction(async (tx) => {
    // 複習作答掛在共用的 REVIEW 練習卷下（與 Level 卡片練習卷分開統計）
    let assessment = await tx.assessment.findFirst({
      where: { type: 'PRACTICE', levelId: null },
    })
    if (!assessment) {
      assessment = await tx.assessment.create({
        data: {
          type: 'PRACTICE',
          name: '錯題複習',
          config: { kind: 'wrong-review' },
          isActive: true,
        },
      })
    }
    let attempt = await tx.assessmentAttempt.findFirst({
      where: { assessmentId: assessment.id, studentId: student.id, completedAt: null },
      orderBy: { startedAt: 'desc' },
    })
    if (!attempt) {
      attempt = await tx.assessmentAttempt.create({
        data: {
          assessmentId: assessment.id,
          studentId: student.id,
          score: 0,
          maxScore: 0,
          passed: false,
          answers: [],
          timeSpentSeconds: 0,
        },
      })
    }

    const priorCount = await tx.questionAttempt.count({
      where: { questionId: wrong.questionId, studentId: student.id },
    })
    await tx.questionAttempt.create({
      data: {
        assessmentAttemptId: attempt.id,
        questionId: wrong.questionId,
        studentId: student.id,
        studentAnswer: answer,
        isCorrect,
        attemptNumber: priorCount + 1,
        hintsUsed: 0,
        timeSpentSeconds: parsed.data.timeSpentSeconds,
      },
    })
    await tx.assessmentAttempt.update({
      where: { id: attempt.id },
      data: {
        score: { increment: isCorrect ? 1 : 0 },
        maxScore: { increment: 1 },
        timeSpentSeconds: { increment: parsed.data.timeSpentSeconds },
      },
    })

    let updated: WrongQuestion
    if (isCorrect) {
      const reviewCount = wrong.reviewCount + 1
      if (reviewCount >= MASTERED_AFTER_REVIEWS) {
        updated = await tx.wrongQuestion.update({
          where: { id: wrong.id },
          data: { reviewCount, reviewStatus: 'MASTERED', nextReviewAt: null },
        })
      } else {
        updated = await tx.wrongQuestion.update({
          where: { id: wrong.id },
          data: {
            reviewCount,
            reviewStatus: 'REVIEWING',
            nextReviewAt: new Date(Date.now() + REVIEW_INTERVAL_DAYS[reviewCount - 1] * DAY_MS),
          },
        })
      }
    } else {
      updated = await tx.wrongQuestion.update({
        where: { id: wrong.id },
        data: {
          errorCount: { increment: 1 },
          lastErrorAt: new Date(),
          reviewStatus: 'REVIEWING',
          nextReviewAt: new Date(Date.now() + DAY_MS),
        },
      })
    }
    return { updated };
  })

  // 複習影響 Mastery（best-effort）
  try {
    const { recomputeMasteryForQuestions } = await import('@/lib/mastery')
    await recomputeMasteryForQuestions(student.id, [wrong.questionId])
  } catch (masteryError) {
    console.error('Mastery recompute failed:', masteryError)
  }

  const solution = Array.isArray(wrong.question.solutionSteps) ? wrong.question.solutionSteps : []

  return NextResponse.json(
    {
      recorded: true,
      isCorrect,
      feedback: isCorrect
        ? result.updated.reviewStatus === 'MASTERED'
          ? '答對了！🎉 這題已結業，從複習名單畢業！'
          : '答對了！🎉 已排定下次複習時間，繼續保持！'
        : '答錯了，再想想看，明天會再排給你複習一次',
      correctAnswer: isCorrect ? undefined : wrong.question.answer,
      solution: isCorrect ? [] : solution,
      reviewStatus: result.updated.reviewStatus,
      reviewCount: result.updated.reviewCount,
      nextReviewAt: result.updated.nextReviewAt,
    },
    { status: 200 }
  )
}