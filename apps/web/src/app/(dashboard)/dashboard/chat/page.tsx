'use client'

export const dynamic = 'force-dynamic'

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Plus, Send, Trash2, Pencil, Check, X, Bot, User as UserIcon } from 'lucide-react'
import { api } from '@/lib/api/client'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { formatRelativeTime } from '@/lib/utils'

interface Conversation {
  id: string
  title: string | null
  status: string
  updatedAt: string
  _count: { messages: number }
}

interface ChatMsg {
  id: string
  role: 'USER' | 'ASSISTANT' | 'SYSTEM'
  content: string
  createdAt: string
}

const SUGGESTIONS = [
  '一元一次方程式怎麼解？',
  '為什麼負負得正？',
  '最大公因數和最小公倍數怎麼分？',
]

function MessageBubble({ msg }: { msg: ChatMsg }) {
  const isUser = msg.role === 'USER'
  return (
    <div className={cn('flex gap-3', isUser && 'flex-row-reverse')}>
      <div
        className={cn(
          'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full',
          isUser ? 'bg-math-500' : 'bg-primary/10'
        )}
      >
        {isUser ? (
          <UserIcon className="h-4 w-4 text-white" aria-hidden="true" />
        ) : (
          <Bot className="h-4 w-4 text-primary" aria-hidden="true" />
        )}
      </div>
      <div
        className={cn(
          'max-w-[85%] rounded-xl px-4 py-2.5 text-sm leading-relaxed',
          isUser ? 'bg-math-500 text-white' : 'bg-muted'
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{msg.content}</p>
        ) : (
          <div className="markdown-body">
            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
              {msg.content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  )
}

export default function AIChatPage() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [activeId, setActiveId] = React.useState<string | null>(null)
  const [input, setInput] = React.useState('')
  const [renamingId, setRenamingId] = React.useState<string | null>(null)
  const [renameText, setRenameText] = React.useState('')
  const bottomRef = React.useRef<HTMLDivElement>(null)

  const listQuery = useQuery({
    queryKey: ['ai', 'conversations', 'me'],
    queryFn: () => api.get<{ conversations: Conversation[] }>('/api/ai/conversations'),
    retry: false,
  })

  const conversations = listQuery.data?.conversations ?? []
  const activeIdResolved = activeId ?? conversations[0]?.id ?? null

  const messagesQuery = useQuery({
    queryKey: ['ai', 'messages', activeIdResolved],
    queryFn: () =>
      api.get<{ messages: ChatMsg[] }>(`/api/ai/conversations/${activeIdResolved}/messages`),
    retry: false,
    enabled: !!activeIdResolved,
  })

  const messages = messagesQuery.data?.messages ?? []

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages.length, activeIdResolved])

  const createMutation = useMutation({
    mutationFn: () => api.post<{ conversation: Conversation }>('/api/ai/conversations', {}),
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ['ai', 'conversations', 'me'] })
      setActiveId(data.conversation.id)
    },
    onError: () => {
      toast({ title: '建立對話失敗', description: '請重試', variant: 'destructive' })
    },
  })

  const sendMutation = useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      api.post<{ userMessage: ChatMsg; assistantMessage: ChatMsg }>(
        `/api/ai/conversations/${id}/messages`,
        { content }
      ),
    onSuccess: async () => {
      setInput('')
      await queryClient.invalidateQueries({ queryKey: ['ai', 'messages', activeIdResolved] })
      await queryClient.invalidateQueries({ queryKey: ['ai', 'conversations', 'me'] })
    },
    onError: () => {
      toast({ title: '送出失敗', description: 'AI 暫時沒回應，請稍後再試', variant: 'destructive' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete<{ deleted: boolean }>(`/api/ai/conversations/${id}`),
    onSuccess: async (_data, id) => {
      if (activeIdResolved === id) setActiveId(null)
      await queryClient.invalidateQueries({ queryKey: ['ai', 'conversations', 'me'] })
      toast({ title: '對話已刪除' })
    },
    onError: () => {
      toast({ title: '刪除失敗', description: '請重試', variant: 'destructive' })
    },
  })

  const renameMutation = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      api.patch<{ conversation: Conversation }>(`/api/ai/conversations/${id}`, { title }),
    onSuccess: async () => {
      setRenamingId(null)
      await queryClient.invalidateQueries({ queryKey: ['ai', 'conversations', 'me'] })
    },
    onError: () => {
      toast({ title: '重新命名失敗', description: '請重試', variant: 'destructive' })
    },
  })

  const handleSend = (text?: string) => {
    const content = (text ?? input).trim()
    if (!content || sendMutation.isPending) return
    const sendTo = async () => {
      let id = activeIdResolved
      if (!id) {
        try {
          const created = await api.post<{ conversation: Conversation }>('/api/ai/conversations', {})
          id = created.conversation.id
          setActiveId(id)
          await queryClient.invalidateQueries({ queryKey: ['ai', 'conversations', 'me'] })
        } catch {
          toast({ title: '建立對話失敗', description: '請重試', variant: 'destructive' })
          return
        }
      }
      sendMutation.mutate({ id, content })
      setInput('')
    }
    void sendTo()
  }

  const handleDelete = (id: string) => {
    if (window.confirm('確定要刪除這個對話嗎？')) deleteMutation.mutate(id)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI 問答</h1>
          <p className="text-muted-foreground mt-1">蘇格拉底式引導教學・不直接給答案</p>
        </div>
        <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending} className="gap-2">
          <Plus className="h-4 w-4" aria-hidden="true" />
          新對話
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        {/* 對話列表 */}
        <Card className="lg:max-h-[calc(100vh-16rem)] lg:overflow-hidden">
          <div className="p-3 space-y-1 max-h-48 overflow-y-auto lg:max-h-[calc(100vh-17rem)]">
            {listQuery.isLoading && (
              <div className="flex justify-center py-8" role="status" aria-label="載入對話中">
                <Spinner size="md" />
              </div>
            )}
            {!listQuery.isLoading && conversations.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                還沒有對話
                <br />
               右側直接提問即可開始
              </p>
            )}
            {conversations.map((c) => (
              <div
                key={c.id}
                className={cn(
                  'group rounded-lg px-3 py-2.5 text-sm cursor-pointer transition-colors',
                  c.id === activeIdResolved ? 'bg-math-500/10' : 'hover:bg-accent'
                )}
                onClick={() => setActiveId(c.id)}
              >
                {renamingId === c.id ? (
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <Input
                      value={renameText}
                      onChange={(e) => setRenameText(e.target.value)}
                      className="h-7 text-sm"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && renameText.trim()) {
                          renameMutation.mutate({ id: c.id, title: renameText.trim() })
                        }
                        if (e.key === 'Escape') setRenamingId(null)
                      }}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 flex-shrink-0"
                      onClick={() => {
                        if (renameText.trim()) renameMutation.mutate({ id: c.id, title: renameText.trim() })
                      }}
                      aria-label="確認重新命名"
                    >
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 flex-shrink-0"
                      onClick={() => setRenamingId(null)}
                      aria-label="取消重新命名"
                    >
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{c.title || '未命名對話'}</p>
                      <p className="text-xs text-muted-foreground">
                        {c._count.messages} 則訊息・{formatRelativeTime(c.updatedAt)}
                      </p>
                    </div>
                    <div className="hidden group-hover:flex gap-0.5 flex-shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation()
                          setRenamingId(c.id)
                          setRenameText(c.title || '')
                        }}
                        aria-label="重新命名對話"
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(c.id)
                        }}
                        aria-label="刪除對話"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* 對話區 */}
        <Card className="flex flex-col min-h-[60vh] lg:max-h-[calc(100vh-16rem)]">
          <ScrollArea className="flex-1 p-4">
            {!activeIdResolved ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-16 space-y-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                  <Bot className="h-8 w-8 text-primary" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-medium">嗨！我是你的 AI 數學老師 👋</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    我不會直接給答案，會一步步引導你自己想出來。試試下面這些問題：
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center">
                  {SUGGESTIONS.map((s) => (
                    <Button key={s} variant="outline" size="sm" onClick={() => handleSend(s)}>
                      {s}
                    </Button>
                  ))}
                </div>
              </div>
            ) : messagesQuery.isLoading ? (
              <div className="flex justify-center py-16" role="status" aria-label="載入訊息中">
                <Spinner size="md" />
              </div>
            ) : messagesQuery.isError ? (
              <Alert variant="destructive">
                <AlertDescription>載入訊息失敗，請重試</AlertDescription>
              </Alert>
            ) : messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-16 space-y-4">
                <p className="text-sm text-muted-foreground">開始提問吧，我會引導你思考而不是直接給答案</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {SUGGESTIONS.map((s) => (
                    <Button key={s} variant="outline" size="sm" onClick={() => handleSend(s)}>
                      {s}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((m) => (
                  <MessageBubble key={m.id} msg={m} />
                ))}
                {sendMutation.isPending && (
                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Bot className="h-4 w-4 text-primary" aria-hidden="true" />
                    </div>
                    <div className="rounded-xl bg-muted px-4 py-2.5 text-sm text-muted-foreground">
                      老師思考中…
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            )}
          </ScrollArea>
          <div className="p-3 border-t">
            <div className="flex gap-2">
              <Input
                placeholder="輸入你的數學問題…（Enter 送出）"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={sendMutation.isPending}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
                maxLength={5000}
              />
              <Button
                onClick={() => handleSend()}
                disabled={sendMutation.isPending || input.trim().length === 0}
                className="gap-2 flex-shrink-0"
              >
                <Send className="h-4 w-4" aria-hidden="true" />
                送出
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
