import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { progressStartSchema, progressUpdateSchema } from '@/lib/validations/schemas'

async function getStudentOrError(userId: string | undefined) {
  if (!userId) {
    return {
      error: NextResponse.json(
        { code: 'UNAUTHORIZED', message: '請先登入' },
        { status: 401 }
      ),
      student: null,
    }
  }
  const student = await prisma.student.findUnique({ where: { userId } })
  if (!student) {
    return {
      error: NextResponse.json(
        { code: 'STUDENT_NOT_FOUND', message: '尚未建立學生檔案，請先完成新手引導' },
        { status: 404 }
      ),
      student: null,
    }
  }
  return { error: null, student }
}

/** 檢查關卡是否已解鎖（第一關或上一關已完成） */
async function isUnlocked(studentId: string, levelId: string) {
  const level = await prisma.level.findUnique({
    where: { id: levelId },
    select: { unit: { select: { courseId: true } } },
  })
  if (!level) return { unlocked: false, missing: true as const }

  const ordered = await prisma.level.findMany({
    where: { unit: { courseId: level.unit.courseId }, isActive: true },
    orderBy: [{ unit: { sortOrder: 'asc' } }, { levelNumber: 'asc' }],
    select: { id: true },
  })
  const index = ordered.findIndex((l) => l.id === levelId)
  if (index === -1) return { unlocked: false, missing: true as const }
  if (index === 0) return { unlocked: true as const, missing: false as const }

  const prev = await prisma.learningProgress.findUnique({
    where: { studentId_levelId: { studentId, levelId: ordered[index - 1].id } },
  })
  return {
    unlocked: !!prev && (prev.status === 'COMPLETED' || prev.status === 'MASTERED'),
    missing: false as const,
  }
}

async function parseJson(request: NextRequest) {
  try {
    return { body: await request.json(), error: null }
  } catch {
    return {
      body: null,
      error: NextResponse.json(
        { code: 'INVALID_JSON', message: '請求格式錯誤' },
        { status: 400 }
      ),
    }
  }
}

/**
 * POST /api/learning/progress/start { levelId }
 * 開始學習：檢查解鎖後建立（或沿用）IN_PROGRESS 進度
 */
export async function POST(request: NextRequest) {
  const session = await auth()
  const { error, student } = await getStudentOrError(session?.user?.id)
  if (error || !student) return error

  const { body, error: jsonError } = await parseJson(request)
  if (jsonError) return jsonError

  const parsed = progressStartSchema.safeParse(body)
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

  const level = await prisma.level.findUnique({
    where: { id: parsed.data.levelId },
    select: { id: true, isActive: true },
  })
  if (!level || !level.isActive) {
    return NextResponse.json(
      { code: 'LEVEL_NOT_FOUND', message: '找不到此關卡' },
      { status: 404 }
    )
  }

  const existing = await prisma.learningProgress.findUnique({
    where: { studentId_levelId: { studentId: student.id, levelId: level.id } },
  })
  if (existing && existing.status !== 'LOCKED') {
    return NextResponse.json({ progress: existing }, { status: 200 })
  }

  const { unlocked } = await isUnlocked(student.id, level.id)
  if (!unlocked) {
    return NextResponse.json(
      { code: 'LEVEL_LOCKED', message: '此關卡尚未解鎖，請先完成前一關' },
      { status: 403 }
    )
  }

  const progress = await prisma.learningProgress.upsert({
    where: { studentId_levelId: { studentId: student.id, levelId: level.id } },
    create: {
      studentId: student.id,
      levelId: level.id,
      status: 'IN_PROGRESS',
      startedAt: new Date(),
    },
    update: { status: 'IN_PROGRESS', startedAt: new Date() },
  })

  return NextResponse.json({ progress }, { status: 200 })
}

/**
 * PATCH /api/learning/progress { levelId, videoProgress?, cardsCompleted? }
 * 更新學習進度（影片進度 0-100、已完成卡片）
 */
export async function PATCH(request: NextRequest) {
  const session = await auth()
  const { error, student } = await getStudentOrError(session?.user?.id)
  if (error || !student) return error

  const { body, error: jsonError } = await parseJson(request)
  if (jsonError) return jsonError

  const parsed = progressUpdateSchema.safeParse(body)
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

  const existing = await prisma.learningProgress.findUnique({
    where: { studentId_levelId: { studentId: student.id, levelId: parsed.data.levelId } },
  })
  if (!existing || existing.status === 'LOCKED') {
    return NextResponse.json(
      { code: 'PROGRESS_NOT_STARTED', message: '請先開始學習此關卡' },
      { status: 403 }
    )
  }

  const progress = await prisma.learningProgress.update({
    where: { studentId_levelId: { studentId: student.id, levelId: parsed.data.levelId } },
    data: {
      ...(parsed.data.videoProgress !== undefined && {
        videoProgress: parsed.data.videoProgress,
      }),
      ...(parsed.data.cardsCompleted !== undefined && {
        cardsCompleted: parsed.data.cardsCompleted,
      }),
    },
  })

  return NextResponse.json({ progress }, { status: 200 })
}