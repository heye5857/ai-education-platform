import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { studentProfileUpdateSchema } from '@/lib/validations/schemas'

/**
 * GET /api/student/profile
 * 取得目前登入學生的個人資料
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

  return NextResponse.json({ student }, { status: 200 })
}

/**
 * PATCH /api/student/profile
 * 更新個人資料（部分欄位），並寫入 Audit Log
 */
export async function PATCH(request: NextRequest) {
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

  const parsed = studentProfileUpdateSchema.safeParse(body)
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

  if (Object.keys(parsed.data).length === 0) {
    return NextResponse.json(
      { code: 'EMPTY_UPDATE', message: '沒有提供要更新的欄位' },
      { status: 400 }
    )
  }

  const userId = session.user.id
  const existing = await prisma.student.findUnique({ where: { userId } })

  if (!existing) {
    return NextResponse.json(
      { code: 'STUDENT_NOT_FOUND', message: '尚未建立學生檔案，請先完成新手引導' },
      { status: 404 }
    )
  }

  // 計算實際變更（只記錄有差異的欄位，值皆為 JSON 安全的純量）
  const changes: Record<
    string,
    { before: string | number | null; after: string | number | null }
  > = {}
  for (const [key, value] of Object.entries(parsed.data)) {
    const before = ((existing as unknown as Record<string, unknown>)[key] ?? null) as
      | string
      | number
      | null
    const after = (value ?? null) as string | number | null
    if (JSON.stringify(before) !== JSON.stringify(after)) {
      changes[key] = { before, after }
    }
  }

  try {
    const student = await prisma.student.update({
      where: { userId },
      data: {
        ...parsed.data,
        school: parsed.data.school ?? null,
        className: parsed.data.className ?? null,
      },
    })

    // 同步 User 姓名
    if (parsed.data.name && parsed.data.name !== session.user.name) {
      await prisma.user.update({
        where: { id: userId },
        data: { name: parsed.data.name },
      })
    }

    // 寫入 Audit Log（best-effort：失敗不影響主流程）
    if (Object.keys(changes).length > 0) {
      try {
        await prisma.auditLog.create({
          data: {
            userId,
            studentId: student.id,
            action: 'student.profile.update',
            entity: 'Student',
            entityId: student.id,
            changes,
          },
        })
      } catch (auditError) {
        console.error('Audit log write failed:', auditError)
      }
    }

    return NextResponse.json({ student }, { status: 200 })
  } catch (error) {
    console.error('Student profile update failed:', error)
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: '更新失敗，請稍後再試' },
      { status: 500 }
    )
  }
}