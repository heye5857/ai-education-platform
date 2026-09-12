import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

type LevelStatus = 'LOCKED' | 'AVAILABLE' | 'IN_PROGRESS' | 'COMPLETED' | 'MASTERED'

const UNLOCKED_BY: LevelStatus[] = ['COMPLETED', 'MASTERED']

/**
 * GET /api/learning/map?grade=&semester=
 * 回傳學生年級/學期的課程樹（Course → Unit → Level）與每關解鎖狀態
 *
 * 解鎖規則：第一關預設 AVAILABLE；其餘關卡僅當前一關 COMPLETED/MASTERED 才 AVAILABLE，
 * 已有進度（非 LOCKED）則以儲存狀態為準。COMPLETED/MASTERED 由 Phase 5 測驗系統寫入。
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

  const params = request.nextUrl.searchParams
  const gradeParam = params.get('grade')
  const semesterParam = params.get('semester')
  const grade = gradeParam !== null ? Number.parseInt(gradeParam, 10) : student.grade
  const semester = semesterParam !== null ? Number.parseInt(semesterParam, 10) : student.semester

  if (!Number.isInteger(grade) || !Number.isInteger(semester)) {
    return NextResponse.json(
      { code: 'VALIDATION_ERROR', message: '年級與學期必須為整數' },
      { status: 400 }
    )
  }

  const course = await prisma.course.findFirst({
    where: { gradeLevel: grade, semester, isActive: true },
    include: {
      units: {
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        include: {
          levels: {
            where: { isActive: true },
            orderBy: { levelNumber: 'asc' },
            include: {
              video: {
                select: {
                  durationSeconds: true,
                  _count: { select: { cards: true } },
                },
              },
            },
          },
        },
      },
    },
  })

  if (!course) {
    return NextResponse.json(
      { code: 'COURSE_NOT_FOUND', message: '此年級學期尚無課程' },
      { status: 404 }
    )
  }

  const levelIds = course.units.flatMap((u) => u.levels.map((l) => l.id))
  const progresses = await prisma.learningProgress.findMany({
    where: { studentId: student.id, levelId: { in: levelIds } },
  })
  const progressByLevel = new Map(progresses.map((p) => [p.levelId, p]))

  let prevUnlocked = true
  const units = course.units.map((unit) => ({
    id: unit.id,
    code: unit.code,
    name: unit.name,
    description: unit.description,
    sortOrder: unit.sortOrder,
    levels: unit.levels.map((level) => {
      const stored = progressByLevel.get(level.id)?.status as LevelStatus | undefined
      let status: LevelStatus
      if (stored && stored !== 'LOCKED') {
        status = stored
      } else if (prevUnlocked) {
        status = 'AVAILABLE'
      } else {
        status = 'LOCKED'
      }
      prevUnlocked = UNLOCKED_BY.includes(status)

      const cardsCompleted = progressByLevel.get(level.id)?.cardsCompleted
      let completedCards = 0
      if (
        cardsCompleted &&
        typeof cardsCompleted === 'object' &&
        !Array.isArray(cardsCompleted) &&
        Array.isArray((cardsCompleted as Record<string, unknown>).completedCardIds)
      ) {
        completedCards = ((cardsCompleted as Record<string, unknown>).completedCardIds as unknown[]).length
      }

      return {
        id: level.id,
        levelNumber: level.levelNumber,
        name: level.name,
        description: level.description,
        status,
        videoDuration: level.video?.durationSeconds ?? null,
        cardCount: level.video?._count.cards ?? 0,
        completedCards,
      }
    }),
  }))

  return NextResponse.json(
    {
      course: {
        id: course.id,
        code: course.code,
        name: course.name,
        description: course.description,
      },
      units,
    },
    { status: 200 }
  )
}