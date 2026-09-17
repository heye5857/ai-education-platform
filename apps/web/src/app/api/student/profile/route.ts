import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { studentProfileUpdateSchema } from '@/lib/validations/schemas'
import { defineApiHandler, validateRequest, ApiError } from '@/lib/logger/api-handler'

/**
 * GET /api/student/profile
 * 取得目前登入學生的個人資料
 */
export const GET = defineApiHandler(async (request, { logger }) => {
  const session = await auth()

  if (!session?.user?.id) {
    throw ApiError.unauthorized('請先登入')
  }

  logger.debug({ userId: session.user.id }, 'Fetching student profile')

  const student = await prisma.student.findUnique({
    where: { userId: session.user.id },
  })

  if (!student) {
    throw ApiError.notFound('尚未建立學生檔案，請先完成新手引導')
  }

  logger.info({ userId: session.user.id, studentId: student.id }, 'Student profile fetched')

  return { student }
}, 'student-profile')

/**
 * PATCH /api/student/profile
 * 更新個人資料（部分欄位），並寫入 Audit Log
 */
export const PATCH = defineApiHandler(async (request, { logger }) => {
  const session = await auth()

  if (!session?.user?.id) {
    throw ApiError.unauthorized('請先登入')
  }

  // 驗證請求 body
  const body = await validateRequest(request, studentProfileUpdateSchema, logger)

  if (Object.keys(body).length === 0) {
    throw ApiError.badRequest('沒有提供要更新的欄位')
  }

  const userId = session.user.id
  const existing = await prisma.student.findUnique({ where: { userId } })

  if (!existing) {
    throw ApiError.notFound('尚未建立學生檔案，請先完成新手引導')
  }

  // 計算實際變更（只記錄有差異的欄位）
  const changes: Record<
    string,
    { before: string | number | null; after: string | number | null }
  > = {}
  for (const [key, value] of Object.entries(body)) {
    const before = ((existing as unknown as Record<string, unknown>)[key] ?? null) as
      | string
      | number
      | null
    const after = (value ?? null) as string | number | null
    if (JSON.stringify(before) !== JSON.stringify(after)) {
      changes[key] = { before, after }
    }
  }

  const student = await prisma.student.update({
    where: { userId },
    data: {
      ...body,
      school: body.school ?? null,
      className: body.className ?? null,
    },
  })

  // 同步 User 姓名
  if (body.name && body.name !== session.user.name) {
    await prisma.user.update({
      where: { id: userId },
      data: { name: body.name },
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
      logger.info({ userId, studentId: student.id, changes }, 'Audit log created')
    } catch (auditError) {
      logger.warn({ error: auditError, userId, studentId: student.id }, 'Audit log write failed (non-blocking)')
    }
  }

  logger.info({ userId, studentId: student.id, changes }, 'Student profile updated')

  return { student }
}, 'student-profile')