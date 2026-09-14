import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { cardAnswerSchema } from '@/lib/validations/schemas'
import { gradeAnswer } from '@/lib/grading'

/**
 * POST /api/learning/cards/answer { cardId, answer?, timeSpentSeconds? }
 *
 * - MINI_PROBLEM：伺服器批改，寫入 QuestionAttempt（自動建立 PRACTICE 測驗與題目列），
 *   並更新 LearningProgress.cardsCompleted
 * - 其他類型（引導思考/問答/教學互動）：只記錄完成狀態，不產生作答分數
 *  （避免無標準答案的參與紀錄污染日後 Mastery 計算）
 */
export async function POST(request: NextRequest) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json(
      { code: 'UNAUTHORIZED', message: '請先登入' },
      { status: 401 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { code: 'INVALID_JSON', message: '請求格式錯誤' },
      { status: 400 }
    )
  }

  const parsed = cardAnswerSchema.safeParse(body)
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

  const student = await prisma.student.findUnique({
    where: { userId: session.user.id },
  })
  if (!student) {
    return NextResponse.json(
      { code: 'STUDENT_NOT_FOUND', message: '尚未建立學生檔案，請先完成新手引導' },
      { status: 404 }
    )
  }

  const card = await prisma.interactiveCard.findUnique({
    where: { id: parsed.data.cardId },
    include: { video: true },
  })
  if (!card) {
    return NextResponse.json(
      { code: 'CARD_NOT_FOUND', message: '找不到此互動卡片' },
      { status: 404 }
    )
  }

  const level = await prisma.level.findUnique({
    where: { videoId: card.videoId },
    include: { unit: { include: { course: true } } },
  })
  if (!level || !level.isActive) {
    return NextResponse.json(
      { code: 'LEVEL_NOT_FOUND', message: '找不到此關卡' },
      { status: 404 }
    )
  }

  const progress = await prisma.learningProgress.findUnique({
    where: { studentId_levelId: { studentId: student.id, levelId: level.id } },
  })
  if (!progress || progress.status === 'LOCKED') {
    return NextResponse.json(
      { code: 'PROGRESS_NOT_STARTED', message: '請先開始學習此關卡' },
      { status: 403 }
    )
  }

  const content =
    card.content && typeof card.content === 'object' && !Array.isArray(card.content)
      ? (card.content as Record<string, unknown>)
      : {}
  const answer = parsed.data.answer.trim()

  // 非評分型卡片：只記錄完成
  if (card.type !== 'MINI_PROBLEM') {
    if (answer.length === 0 && card.type !== 'TEACHING_INTERACTION') {
      return NextResponse.json(
        { code: 'ANSWER_REQUIRED', message: '請先輸入你的想法再送出' },
        { status: 400 }
      )
    }
    await markCardCompleted(student.id, level.id, card.id)
    return NextResponse.json(
      {
        recorded: true,
        isCorrect: null,
        feedback: '已記錄！能把想法寫下來就是進步，繼續加油！',
      },
      { status: 200 }
    )
  }

  // MINI_PROBLEM：伺服器批改
  if (answer.length === 0) {
    return NextResponse.json(
      { code: 'ANSWER_REQUIRED', message: '請先輸入答案再送出' },
      { status: 400 }
    )
  }
  const expected = typeof content.answer === 'string' ? content.answer : ''
  const { isCorrect } = gradeAnswer('SHORT_ANSWER', answer, expected)

  const result = await prisma.$transaction(async (tx) => {
    // 題目列：同一張卡片共用一題（tags.cardId），避免重複建題污染題庫
    let question = await tx.question.findFirst({
      where: { tags: { path: ['cardId'], equals: card.id } },
    })
    if (!question) {
      question = await tx.question.create({
        data: {
          type: 'SHORT_ANSWER',
          stem: typeof content.question === 'string' ? content.question : '互動卡片練習題',
          answer: expected,
          solutionSteps: typeof content.hint === 'string' ? [content.hint] : [],
          difficulty: 3,
          source: 'GENERATED',
          gradeLevel: level.unit.course.gradeLevel,
          tags: { cardId: card.id, levelId: level.id },
        },
      })
    }

    // 練習測驗：每關一個 PRACTICE Assessment，未結算的 attempt 續用
    let assessment = await tx.assessment.findFirst({
      where: { type: 'PRACTICE', levelId: level.id },
    })
    if (!assessment) {
      assessment = await tx.assessment.create({
        data: {
          type: 'PRACTICE',
          levelId: level.id,
          name: `${level.name} 課堂練習`,
          config: {},
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

    const priorAttempts = await tx.questionAttempt.count({
      where: { questionId: question.id, studentId: student.id },
    })
    await tx.questionAttempt.create({
      data: {
        assessmentAttemptId: attempt.id,
        questionId: question.id,
        studentId: student.id,
        studentAnswer: answer,
        isCorrect,
        attemptNumber: priorAttempts + 1,
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

    return { attemptId: attempt.id };
  })

  // 只有答對才標記完成：答錯可重試（每次作答都會留紀錄），正解不直接公佈
  if (isCorrect) {
    await markCardCompleted(student.id, level.id, card.id)
  }

  const hint = typeof content.hint === 'string' ? content.hint : ''
  return NextResponse.json(
    {
      recorded: true,
      isCorrect,
      feedback: isCorrect
        ? '答對了！🎉 觀念很清楚，繼續保持！'
        : `答錯了，再想想看 💡 提示：${hint || '檢查一下計算過程'}`,
      attemptId: result.attemptId,
    },
    { status: 200 }
  )
}

async function markCardCompleted(studentId: string, levelId: string, cardId: string) {
  const progress = await prisma.learningProgress.findUnique({
    where: { studentId_levelId: { studentId, levelId } },
  })
  if (!progress) return

  const raw = progress.cardsCompleted
  const ids: string[] =
    raw && typeof raw === 'object' && !Array.isArray(raw) && Array.isArray((raw as Record<string, unknown>).completedCardIds)
      ? ((raw as Record<string, unknown>).completedCardIds as unknown[]).filter(
          (v): v is string => typeof v === 'string'
        )
      : []
  if (ids.includes(cardId)) return

  await prisma.learningProgress.update({
    where: { studentId_levelId: { studentId, levelId } },
    data: { cardsCompleted: { completedCardIds: [...ids, cardId] } },
  })
}