import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

/**
 * GET /api/student/dashboard
 * 首頁摘要：個人檔案 + 學習統計（錯題、對話、進度、平均掌握度）
 */
export async function GET() {
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

  const [
    wrongQuestionsPending,
    wrongQuestionsMastered,
    conversationsActive,
    levelsCompleted,
    levelsInProgress,
    masteryAgg,
  ] = await Promise.all([
    prisma.wrongQuestion.count({
      where: { studentId: student.id, reviewStatus: { in: ['NEW', 'REVIEWING'] } },
    }),
    prisma.wrongQuestion.count({
      where: { studentId: student.id, reviewStatus: 'MASTERED' },
    }),
    prisma.conversation.count({
      where: { studentId: student.id, status: 'ACTIVE' },
    }),
    prisma.learningProgress.count({
      where: { studentId: student.id, status: { in: ['COMPLETED', 'MASTERED'] } },
    }),
    prisma.learningProgress.count({
      where: { studentId: student.id, status: 'IN_PROGRESS' },
    }),
    prisma.studentKnowledgePoint.aggregate({
      where: { studentId: student.id },
      _avg: { masteryScore: true },
      _count: true,
    }),
  ])

  return NextResponse.json(
    {
      profile: student,
      stats: {
        wrongQuestionsPending,
        wrongQuestionsMastered,
        conversationsActive,
        levelsCompleted,
        levelsInProgress,
        masteryAvg:
          masteryAgg._count > 0 ? Math.round((masteryAgg._avg.masteryScore ?? 0) * 10) / 10 : 0,
        knowledgePointsTracked: masteryAgg._count,
      },
    },
    { status: 200 }
  )
}