import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { levelIdSchema } from '@/lib/validations/schemas'

/**
 * GET /api/learning/cards?levelId=
 * 回傳關卡影片的互動卡片（作答用：不含 MINI_PROBLEM 正確答案）與完成狀態
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
    include: {
      video: {
        include: { cards: { orderBy: { sortOrder: 'asc' } } },
      },
    },
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

  let completedIds: string[] = []
  const raw = progress?.cardsCompleted
  if (
    raw &&
    typeof raw === 'object' &&
    !Array.isArray(raw) &&
    Array.isArray((raw as Record<string, unknown>).completedCardIds)
  ) {
    completedIds = ((raw as Record<string, unknown>).completedCardIds as unknown[]).filter(
      (v): v is string => typeof v === 'string'
    )
  }

  const cards = (level.video?.cards ?? []).map((card) => {
    const content =
      card.content && typeof card.content === 'object' && !Array.isArray(card.content)
        ? { ...(card.content as Record<string, unknown>) }
        : {}
    // 作答前不下發正解（防看原始碼作弊），批改一律走伺服器
    if (card.type === 'MINI_PROBLEM') delete content.answer
    return {
      id: card.id,
      triggerTimeSeconds: card.triggerTimeSeconds,
      type: card.type,
      content,
      sortOrder: card.sortOrder,
      isRequired: card.isRequired,
      completed: completedIds.includes(card.id),
    }
  })

  return NextResponse.json({ cards }, { status: 200 })
}