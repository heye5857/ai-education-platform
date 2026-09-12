import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { onboardingSchema } from '@/lib/validations/schemas'

/**
 * POST /api/onboarding
 * 完成新手引導：建立/更新 Student 檔案，並將 User.onboardingCompleted 設為 true
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

  const parsed = onboardingSchema.safeParse(body)
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

  const { name, school, grade, className, semester } = parsed.data
  const userId = session.user.id

  try {
    // Upsert Student 檔案（註冊後自動建立，若已存在則更新）
    const student = await prisma.student.upsert({
      where: { userId },
      create: {
        userId,
        name,
        school: school || null,
        grade,
        className: className || null,
        semester,
      },
      update: {
        name,
        school: school || null,
        grade,
        className: className || null,
        semester,
      },
    })

    // 同步 User 姓名並標記引導完成
    await prisma.user.update({
      where: { id: userId },
      data: {
        name,
        onboardingCompleted: true,
      },
    })

    return NextResponse.json({ student }, { status: 200 })
  } catch (error) {
    console.error('Onboarding failed:', error)
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: '設定失敗，請稍後再試' },
      { status: 500 }
    )
  }
}