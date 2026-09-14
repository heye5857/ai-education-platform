import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

const renameSchema = z.object({
  title: z.string().min(1, '標題不可為空').max(100, '標題不能超過 100 個字元'),
})

async function getOwnedConversation(userId: string | undefined, id: string) {
  if (!userId) return { error: 'UNAUTHORIZED' as const, conversation: null }
  const student = await prisma.student.findUnique({ where: { userId } })
  if (!student) return { error: 'STUDENT_NOT_FOUND' as const, conversation: null }
  const conversation = await prisma.conversation.findFirst({
    where: { id, studentId: student.id, status: { not: 'DELETED' } },
  })
  if (!conversation) return { error: 'NOT_FOUND' as const, conversation: null }
  return { error: null, conversation }
}

/**
 * PATCH /api/ai/conversations/[id] { title } — 重新命名
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  const { error, conversation } = await getOwnedConversation(session?.user?.id, params.id)

  if (error === 'UNAUTHORIZED') {
    return NextResponse.json({ code: 'UNAUTHORIZED', message: '請先登入' }, { status: 401 })
  }
  if (error === 'STUDENT_NOT_FOUND') {
    return NextResponse.json({ code: 'STUDENT_NOT_FOUND', message: '尚未建立學生檔案' }, { status: 404 })
  }
  if (error === 'NOT_FOUND' || !conversation) {
    return NextResponse.json({ code: 'NOT_FOUND', message: '找不到此對話' }, { status: 404 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ code: 'INVALID_JSON', message: '請求格式錯誤' }, { status: 400 })
  }

  const parsed = renameSchema.safeParse(body)
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

  const updated = await prisma.conversation.update({
    where: { id: conversation.id },
    data: { title: parsed.data.title },
  })

  return NextResponse.json({ conversation: updated }, { status: 200 })
}

/**
 * DELETE /api/ai/conversations/[id] — 軟刪除（DELETED）
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  const { error, conversation } = await getOwnedConversation(session?.user?.id, params.id)

  if (error === 'UNAUTHORIZED') {
    return NextResponse.json({ code: 'UNAUTHORIZED', message: '請先登入' }, { status: 401 })
  }
  if (error === 'STUDENT_NOT_FOUND') {
    return NextResponse.json({ code: 'STUDENT_NOT_FOUND', message: '尚未建立學生檔案' }, { status: 404 })
  }
  if (error === 'NOT_FOUND' || !conversation) {
    return NextResponse.json({ code: 'NOT_FOUND', message: '找不到此對話' }, { status: 404 })
  }

  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { status: 'DELETED' },
  })

  return NextResponse.json({ deleted: true }, { status: 200 })
}