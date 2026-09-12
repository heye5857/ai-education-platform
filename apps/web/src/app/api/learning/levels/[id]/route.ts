import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { levelIdSchema } from '@/lib/validations/schemas'

/**
 * GET /api/learning/levels/[id]
 * 回傳關卡詳情（單元/課程breadcrumb、影片、卡片數）與學生進度及解鎖狀態
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json(
      { code: 'UNAUTHORIZED', message: '請先登入' },
      { status: 401 }
    )
  }

  if (!levelIdSchema.safeParse(params.id).success) {
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
    where: { id: params.id },
    include: {
      unit: {
        include: {
          course: { select: { id: true, code: true, name: true } },
        },
      },
      video: {
        select: {
          id: true,
          url: true,
          title: true,
          durationSeconds: true,
          _count: { select: { cards: true } },
        },
      },
    },
  })

  if (!level || !level.isActive) {
    return NextResponse.json(
      { code: 'LEVEL_NOT_FOUND', message: '找不到此關卡' },
      { status: 404 }
    )
  }

  // 同課程依序排列，找出上一關以判定是否解鎖
  const orderedLevels = await prisma.level.findMany({
    where: { unit: { courseId: level.unit.courseId }, isActive: true },
    orderBy: [{ unit: { sortOrder: 'asc' } }, { levelNumber: 'asc' }],
    select: { id: true },
  })
  const index = orderedLevels.findIndex((l) => l.id === level.id)
  const prevLevelId = index > 0 ? orderedLevels[index - 1].id : null
  const nextLevelId =
    index >= 0 && index < orderedLevels.length - 1 ? orderedLevels[index + 1].id : null

  const [progress, prevProgress] = await Promise.all([
    prisma.learningProgress.findUnique({
      where: { studentId_levelId: { studentId: student.id, levelId: level.id } },
    }),
    prevLevelId
      ? prisma.learningProgress.findUnique({
          where: { studentId_levelId: { studentId: student.id, levelId: prevLevelId } },
        })
      : Promise.resolve(null),
  ])

  const stored = progress?.status
  let status: 'LOCKED' | 'AVAILABLE' | 'IN_PROGRESS' | 'COMPLETED' | 'MASTERED'
  if (stored && stored !== 'LOCKED') {
    status = stored
  } else if (
    prevLevelId === null ||
    (prevProgress && (prevProgress.status === 'COMPLETED' || prevProgress.status === 'MASTERED'))
  ) {
    status = 'AVAILABLE'
  } else {
    status = 'LOCKED'
  }

  return NextResponse.json(
    {
      level: {
        id: level.id,
        levelNumber: level.levelNumber,
        name: level.name,
        description: level.description,
        passScore: level.passScore,
        questionCount: level.questionCount,
      },
      unit: {
        id: level.unit.id,
        code: level.unit.code,
        name: level.unit.name,
      },
      course: level.unit.course,
      video: level.video
        ? {
            id: level.video.id,
            url: level.video.url,
            title: level.video.title,
            durationSeconds: level.video.durationSeconds,
          }
        : null,
      cardCount: level.video?._count.cards ?? 0,
      progress: progress
        ? {
            status: progress.status,
            videoProgress: progress.videoProgress,
            cardsCompleted: progress.cardsCompleted,
            testAttempts: progress.testAttempts,
          }
        : null,
      status,
      prevLevelId,
      nextLevelId,
    },
    { status: 200 }
  )
}