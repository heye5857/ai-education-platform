import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { aiMessageSchema } from '@/lib/validations/schemas'
import { getProvider } from '@/lib/ai/factory'
import { getTeachingSystemPrompt } from '@/lib/ai/prompt'
import { getGradeLabel } from '@/lib/semester'
import type { ChatMessage } from '@/lib/ai/types'

const HISTORY_LIMIT = 10

async function getActiveConversation(userId: string | undefined, id: string) {
  if (!userId) return { error: 'UNAUTHORIZED' as const, conversation: null, student: null }
  const student = await prisma.student.findUnique({ where: { userId } })
  if (!student) return { error: 'STUDENT_NOT_FOUND' as const, conversation: null, student: null }
  const conversation = await prisma.conversation.findFirst({
    where: { id, studentId: student.id, status: 'ACTIVE' },
  })
  if (!conversation) return { error: 'NOT_FOUND' as const, conversation: null, student }
  return { error: null, conversation, student }
}

/**
 * GET /api/ai/conversations/[id]/messages — 訊息列表（時間正序）
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  const { error, conversation } = await getActiveConversation(session?.user?.id, params.id)

  if (error === 'UNAUTHORIZED') {
    return NextResponse.json({ code: 'UNAUTHORIZED', message: '請先登入' }, { status: 401 })
  }
  if (error === 'STUDENT_NOT_FOUND') {
    return NextResponse.json({ code: 'STUDENT_NOT_FOUND', message: '尚未建立學生檔案' }, { status: 404 })
  }
  if (error === 'NOT_FOUND' || !conversation) {
    return NextResponse.json({ code: 'NOT_FOUND', message: '找不到此對話' }, { status: 404 })
  }

  const messages = await prisma.message.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: 'asc' },
    take: 200,
  })

  return NextResponse.json({ messages }, { status: 200 })
}

/**
 * POST /api/ai/conversations/[id]/messages { content }
 * 存使用者訊息 → 組 Context（畫像＋弱項＋錯題＋近 10 輪）→ Provider 回覆 → 存 AI 訊息
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  const { error, conversation, student } = await getActiveConversation(
    session?.user?.id,
    params.id
  )

  if (error === 'UNAUTHORIZED') {
    return NextResponse.json({ code: 'UNAUTHORIZED', message: '請先登入' }, { status: 401 })
  }
  if (error === 'STUDENT_NOT_FOUND' || !student) {
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

  const parsed = aiMessageSchema.safeParse(body)
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

  const userMessage = await prisma.message.create({
    data: { conversationId: conversation.id, role: 'USER', content: parsed.data.content },
  })

  // Context Builder：畫像＋弱項 Top5＋待複習數＋近 10 輪
  const [weakRows, wrongPending, history] = await Promise.all([
    prisma.studentKnowledgePoint.findMany({
      where: { studentId: student.id },
      orderBy: { masteryScore: 'asc' },
      take: 5,
      include: { knowledgePoint: { select: { code: true, name: true } } },
    }),
    prisma.wrongQuestion.count({
      where: { studentId: student.id, reviewStatus: { in: ['NEW', 'REVIEWING'] } },
    }),
    prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'desc' },
      take: HISTORY_LIMIT,
    }),
  ])

  const systemPrompt = getTeachingSystemPrompt({
    studentName: student.name || session?.user?.name || '同學',
    grade: student.grade,
    weakKPs: weakRows.map((r) => ({
      code: r.knowledgePoint.code,
      name: r.knowledgePoint.name,
      masteryScore: r.masteryScore,
    })),
    recentWrongCount: wrongPending,
  })

  const historyAsc = [...history].reverse()
  const chatMessages: ChatMessage[] = historyAsc.map((m) => ({
    role: m.role === 'ASSISTANT' ? ('assistant' as const) : ('user' as const),
    content: m.content,
  }))

  let assistantContent: string
  let modelUsed = 'unknown'
  let phase: 'DIAGNOSE' | 'SCAFFOLD' | 'GUIDE' | 'VERIFY' | 'EXTEND' = 'GUIDE'
  try {
    const provider = getProvider()
    modelUsed = `${provider.name}/${provider.model}`
    const res = await provider.chatCompletion({
      messages: chatMessages,
      systemPrompt,
      maxTokens: 1024,
      temperature: 0.7,
    })
    assistantContent = res.content
    if (res.phase) phase = res.phase
  } catch (providerError) {
    console.error('AI provider failed:', providerError)
    return NextResponse.json(
      {
        code: 'AI_PROVIDER_ERROR',
        message:
          providerError instanceof Error ? providerError.message : 'AI 回應失敗，請稍後再試',
      },
      { status: 502 }
    )
  }

  const assistantMessage = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      role: 'ASSISTANT',
      content: assistantContent,
      metadata: { provider: modelUsed, phase },
    },
  })

  // 收尾：自動標題（僅首輪）＋觸碰更新時間＋快照（best-effort）
  try {
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        updatedAt: new Date(),
        ...(!conversation.title
          ? {
              title:
                parsed.data.content.length > 20
                  ? `${parsed.data.content.slice(0, 20)}…`
                  : parsed.data.content,
            }
          : {}),
        contextSnapshot: {
          studentGrade: `${getGradeLabel(student.grade)}（${student.grade}年級）`,
          weakTop: weakRows.map((r) => r.knowledgePoint.code),
          updatedAt: new Date().toISOString(),
        },
      },
    })
  } catch (snapshotError) {
    console.error('Conversation snapshot failed:', snapshotError)
  }

  return NextResponse.json({ userMessage, assistantMessage }, { status: 201 })
}