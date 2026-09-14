import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { assessmentSubmitSchema } from '@/lib/validations/schemas'
import { gradeAnswer } from '@/lib/grading'

/**
 * POST /api/learning/level-test/submit
 * 測驗評分：自動批改 → AssessmentAttempt + QuestionAttempt →
 * 錯題同步（WrongQuestion）→ Mastery 重算 → 通過則 COMPLETED 解鎖下一關
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

  const parsed = assessmentSubmitSchema.safeParse(body)
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

  const assessment = await prisma.assessment.findUnique({
    where: { id: parsed.data.assessmentId },
    include: { level: true },
  })
  if (!assessment || !assessment.isActive) {
    return NextResponse.json(
      { code: 'ASSESSMENT_NOT_FOUND', message: '找不到此測驗' },
      { status: 404 }
    )
  }

  // 作答範圍驗證：LEVEL_TEST 用 LevelQuestion；INITIAL 用建立時快照的 questionIds
  let allowedIds: Set<string> | null = null
  if (assessment.levelId) {
    const links = await prisma.levelQuestion.findMany({
      where: { levelId: assessment.levelId },
      select: { questionId: true },
    })
    allowedIds = new Set(links.map((l) => l.questionId))
  } else {
    const config =
      assessment.config && typeof assessment.config === 'object' && !Array.isArray(assessment.config)
        ? (assessment.config as Record<string, unknown>)
        : {}
    if (Array.isArray(config.questionIds)) {
      allowedIds = new Set(config.questionIds.filter((v): v is string => typeof v === 'string'))
    }
  }

  const questions = await prisma.question.findMany({
    where: { id: { in: parsed.data.answers.map((a) => a.questionId) } },
    include: { knowledgePoints: { select: { knowledgePointId: true } } },
  })
  const questionById = new Map(questions.map((q) => [q.id, q]))

  for (const a of parsed.data.answers) {
    if (!questionById.has(a.questionId) || (allowedIds && !allowedIds.has(a.questionId))) {
      return NextResponse.json(
        { code: 'QUESTION_OUT_OF_SCOPE', message: '作答包含本次測驗範圍外的題目' },
        { status: 400 }
      )
    }
  }

  const graded = parsed.data.answers.map((a) => {
    const q = questionById.get(a.questionId)!
    const { isCorrect, gradable } = gradeAnswer(q.type, a.answer, q.answer)
    return { ...a, isCorrect, gradable, question: q }
  })

  const score = graded.filter((g) => g.isCorrect).length
  const maxScore = graded.length
  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0

  let passScore = 70
  const levelId: string | null = assessment.levelId
  if (assessment.levelId) {
    const lv = await prisma.level.findUnique({
      where: { id: assessment.levelId },
      select: { passScore: true },
    })
    if (lv) passScore = lv.passScore
  } else {
    const config =
      assessment.config && typeof assessment.config === 'object' && !Array.isArray(assessment.config)
        ? (assessment.config as Record<string, unknown>)
        : {}
    if (typeof config.passScore === 'number') passScore = config.passScore
  }
  const passed = percentage >= passScore

  const result = await prisma.$transaction(async (tx) => {
    const attempt = await tx.assessmentAttempt.create({
      data: {
        assessmentId: assessment.id,
        studentId: student.id,
        score,
        maxScore,
        passed,
        answers: parsed.data.answers,
        timeSpentSeconds: parsed.data.timeSpentSeconds,
        completedAt: new Date(),
      },
    })

    await tx.questionAttempt.createMany({
      data: graded.map((g) => ({
        assessmentAttemptId: attempt.id,
        questionId: g.questionId,
        studentId: student.id,
        studentAnswer: g.answer,
        isCorrect: g.isCorrect,
        attemptNumber: 1,
        hintsUsed: g.hintsUsed,
        timeSpentSeconds: g.timeSpentSeconds,
        errorAnalysis: g.gradable ? undefined : { manualReview: true },
      })),
    })

    // 決策 12：所有錯題同步進 WrongQuestion
    let wrongCount = 0
    for (const g of graded) {
      if (g.isCorrect) continue
      wrongCount++
      await tx.wrongQuestion.upsert({
        where: { studentId_questionId: { studentId: student.id, questionId: g.questionId } },
        create: {
          studentId: student.id,
          questionId: g.questionId,
          errorCount: 1,
          reviewStatus: 'NEW',
        },
        update: {
          errorCount: { increment: 1 },
          lastErrorAt: new Date(),
        },
      })
    }

    // KP 作答計數先行寫入（Mastery 分數由事務外的 recompute 重算，避免長事務）
    const kpIds = [...new Set(graded.flatMap((g) => g.question.knowledgePoints.map((k) => k.knowledgePointId)))]
    for (const kpId of kpIds) {
      await tx.studentKnowledgePoint.upsert({
        where: { studentId_knowledgePointId: { studentId: student.id, knowledgePointId: kpId } },
        create: { studentId: student.id, knowledgePointId: kpId },
        update: {},
      })
    }

    // 通過 → Level COMPLETED（解鎖下一關由 map API 的規則自動生效）
    if (levelId) {
      const existing = await tx.learningProgress.findUnique({
        where: { studentId_levelId: { studentId: student.id, levelId } },
      })
      if (existing) {
        await tx.learningProgress.update({
          where: { studentId_levelId: { studentId: student.id, levelId } },
          data: {
            testAttempts: { increment: 1 },
            ...(passed ? { status: 'COMPLETED', completedAt: new Date() } : {}),
          },
        })
      } else {
        await tx.learningProgress.create({
          data: {
            studentId: student.id,
            levelId,
            status: passed ? 'COMPLETED' : 'IN_PROGRESS',
            startedAt: new Date(),
            completedAt: passed ? new Date() : null,
            testAttempts: 1,
          },
        })
      }
    }

    return { attemptId: attempt.id, wrongCount };
  })

  // Mastery 重算（TBD-02 綜合評分模型；best-effort，失敗不影響已寫入的成績）
  try {
    const { recomputeMasteryForQuestions } = await import('@/lib/mastery')
    await recomputeMasteryForQuestions(
      student.id,
      graded.map((g) => g.questionId)
    )
  } catch (masteryError) {
    console.error('Mastery recompute failed:', masteryError)
  }

  // 下一關（通過才需要，但一併回傳方便 UI 導航）
  let nextLevelId: string | null = null
  if (levelId) {
    const lv = await prisma.level.findUnique({
      where: { id: levelId },
      select: { unit: { select: { courseId: true } } },
    })
    if (lv) {
      const ordered = await prisma.level.findMany({
        where: { unit: { courseId: lv.unit.courseId }, isActive: true },
        orderBy: [{ unit: { sortOrder: 'asc' } }, { levelNumber: 'asc' }],
        select: { id: true },
      })
      const idx = ordered.findIndex((l) => l.id === levelId)
      nextLevelId = idx >= 0 && idx < ordered.length - 1 ? ordered[idx + 1].id : null
    }
  }

  return NextResponse.json(
    {
      attemptId: result.attemptId,
      score,
      maxScore,
      percentage,
      passed,
      passScore,
      wrongCount: result.wrongCount,
      nextLevelId,
      results: graded.map((g) => ({
        questionId: g.questionId,
        studentAnswer: g.answer,
        isCorrect: g.isCorrect,
        gradable: g.gradable,
        correctAnswer: g.question.answer,
        solution: Array.isArray(g.question.solutionSteps) ? g.question.solutionSteps : [],
      })),
    },
    { status: 200 }
  )
}