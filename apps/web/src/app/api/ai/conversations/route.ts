import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { createConversationSchema } from '@/lib/validations/schemas'

async function getStudentId(userId: string | undefined) {
  if (!userId) return null
  const student = await prisma.student.findUnique({ where: { userId } })
  return student?.id ?? null
}

/**
 * GET /api/ai/conversations — 對話列表（排除已刪除，依更新時間倒序）
 */
export async function GET() {
  const session = await auth()
  const studentId = await getStudentId(session?.user?.id)
  if (!studentId) {
    return NextResponse.json(
      { code: session?.user ? 'STUDENT_NOT_FOUND' : 'UNAUTHORIZED', message: '請先登入並完成新手引導' },
      { status: session?.user ? 404 : 401 }
    )
  }

  const conversations = await prisma.conversation.findMany({
    where: { studentId, status: { not: 'DELETED' } },
    orderBy: { updatedAt: 'desc' },
    take: 50,
    select: {
      id: true,
      title: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { messages: true } },
    },
  })

  return NextResponse.json({ conversations }, { status: 200 })
}

/**
 * POST /api/ai/conversations { title? } — 新建對話
 */
export async function POST(request: NextRequest) {
  const session = await auth()
  const studentId = await getStudentId(session?.user?.id)
  if (!studentId) {
    return NextResponse.json(
      { code: session?.user ? 'STUDENT_NOT_FOUND' : 'UNAUTHORIZED', message: '請先登入並完成新手引導' },
      { status: session?.user ? 404 : 401 }
    )
  }

  let body: unknown = {}
  try {
    const text = await request.text()
    if (text) body = JSON.parse(text)
  } catch {
    return NextResponse.json({ code: 'INVALID_JSON', message: '請求格式錯誤' }, { status: 400 })
  }

  const parsed = createConversationSchema.safeParse(body)
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

  const conversation = await prisma.conversation.create({
    data: { studentId, title: parsed.data.title ?? null, status: 'ACTIVE' },
  })

  return NextResponse.json({ conversation }, { status: 201 })
}