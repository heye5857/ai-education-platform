'use client'

export const dynamic = 'force-dynamic'

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Search, ChevronDown, ChevronUp, CheckCircle, Archive, RotateCcw, Loader2, Inbox } from 'lucide-react'
import { api } from '@/lib/api/client'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { formatRelativeTime } from '@/lib/utils'

type ReviewStatus = 'NEW' | 'REVIEWING' | 'MASTERED' | 'ARCHIVED'

interface WrongItem {
  id: string
  questionId: string
  errorCount: number
  firstErrorAt: string
  lastErrorAt: string
  reviewStatus: ReviewStatus
  reviewCount: number
  nextReviewAt: string | null
  question: {
    id: string
    type: string
    stem: string
    difficulty: number
    gradeLevel: number
    knowledgePoints: Array<{ code: string; name: string }>
  }
}

interface WrongList {
  items: WrongItem[]
  total: number
  page: number
  limit: number
  dueCount: number
}

interface WrongDetail {
  wrong: WrongItem & { errorPatterns?: unknown }
  question: {
    id: string
    stem: string
    options: Array<{ id: string; text: string }> | null
    answer: string
    solutionSteps: string[]
    knowledgePoints: Array<{ code: string; name: string; topic: string }>
  }
  attempts: Array<{
    id: string
    studentAnswer: string
    isCorrect: boolean
    attemptNumber: number
    timeSpentSeconds: number
    createdAt: string
  }>
}

interface ReviewResult {
  recorded: boolean
  isCorrect: boolean
  feedback: string
  correctAnswer?: string
  solution: string[]
  reviewStatus: ReviewStatus
  reviewCount: number
  nextReviewAt: string | null
}

const STATUS_TABS: Array<{ value: string; label: string }> = [
  { value: 'all', label: '全部' },
  { value: 'NEW', label: '待複習' },
  { value: 'REVIEWING', label: '複習中' },
  { value: 'MASTERED', label: '已掌握' },
  { value: 'ARCHIVED', label: '已歸檔' },
]

const STATUS_META: Record<ReviewStatus, { label: string; variant: 'destructive' | 'warning' | 'success' | 'secondary' }> = {
  NEW: { label: '待複習', variant: 'destructive' },
  REVIEWING: { label: '複習中', variant: 'warning' },
  MASTERED: { label: '已掌握', variant: 'success' },
  ARCHIVED: { label: '已歸檔', variant: 'secondary' },
}

function WrongDetailView({ wrongId, onChanged }: { wrongId: string; onChanged: () => void }) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [answer, setAnswer] = React.useState('')
  const [result, setResult] = React.useState<ReviewResult | null>(null)

  const detailQuery = useQuery({
    queryKey: ['student', 'wrong-question', wrongId],
    queryFn: () => api.get<WrongDetail>(`/api/student/wrong-questions/${wrongId}`),
    retry: false,
  })

  const reviewMutation = useMutation({
    mutationFn: (payload: { answer: string }) =>
      api.post<ReviewResult>(`/api/student/wrong-questions/${wrongId}/review`, {
        answer: payload.answer,
        timeSpentSeconds: 0,
      }),
    onSuccess: async (data) => {
      setResult(data)
      setAnswer('')
      await queryClient.invalidateQueries({ queryKey: ['student', 'wrong-questions'] })
      await detailQuery.refetch()
      onChanged()
    },
    onError: () => {
      toast({ title: '送出失敗', description: '請檢查網路後重試', variant: 'destructive' })
    },
  })

  const statusMutation = useMutation({
    mutationFn: (reviewStatus: 'REVIEWING' | 'MASTERED' | 'ARCHIVED') =>
      api.patch<{ wrong: WrongItem }>(`/api/student/wrong-questions/${wrongId}`, { reviewStatus }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['student', 'wrong-questions'] })
      await detailQuery.refetch()
      onChanged()
      toast({ title: '狀態已更新' })
    },
    onError: () => {
      toast({ title: '更新失敗', description: '請重試', variant: 'destructive' })
    },
  })

  if (detailQuery.isLoading) {
    return (
      <div className="flex justify-center py-6" role="status" aria-label="載入詳情中">
        <Spinner size="md" />
      </div>
    )
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <Alert variant="destructive">
        <AlertDescription>載入詳情失敗，請重試</AlertDescription>
      </Alert>
    )
  }

  const { question, attempts, wrong } = detailQuery.data
  const options = Array.isArray(question.options) ? question.options : null

  return (
    <div className="space-y-4 pt-2">
      <div>
        <p className="font-medium">{question.stem}</p>
        {options && (
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            {options.map((o) => (
              <li key={o.id}>
                <span className="font-bold">{o.id}.</span> {o.text}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {question.knowledgePoints.map((k) => (
            <Badge key={k.code} variant="outline">
              {k.name}
            </Badge>
          ))}
        </div>
      </div>

      <Separator />

      {/* 複習作答 */}
      {wrong.reviewStatus !== 'ARCHIVED' && (
        <div className="space-y-2">
          <Label htmlFor={`review-${wrong.id}`}>再答一次看看</Label>
          <div className="flex gap-2">
            <Input
              id={`review-${wrong.id}`}
              placeholder="請輸入答案…"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              disabled={reviewMutation.isPending}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && answer.trim()) reviewMutation.mutate({ answer: answer.trim() })
              }}
            />
            <Button
              onClick={() => reviewMutation.mutate({ answer: answer.trim() })}
              disabled={reviewMutation.isPending || answer.trim().length === 0}
              className="gap-2 flex-shrink-0"
            >
              {reviewMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              送出
            </Button>
          </div>
          {result && (
            <Alert variant={result.isCorrect ? 'success' : 'destructive'}>
              <AlertDescription>
                <p>{result.feedback}</p>
                {result.correctAnswer !== undefined && (
                  <p className="mt-1 font-medium">正確答案：{result.correctAnswer}</p>
                )}
                {result.solution.length > 0 && !result.isCorrect && (
                  <ol className="mt-2 space-y-0.5 text-sm list-decimal list-inside">
                    {result.solution.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ol>
                )}
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* 作答歷程 */}
      {attempts.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-2">作答歷程（近 {attempts.length} 次）</p>
          <ul className="space-y-1.5 text-sm">
            {attempts.map((a) => (
              <li key={a.id} className="flex items-center gap-2 text-muted-foreground">
                {a.isCorrect ? (
                  <CheckCircle className="h-4 w-4 text-success-500 flex-shrink-0" aria-hidden="true" />
                ) : (
                  <span className="h-4 w-4 flex-shrink-0 rounded-full bg-destructive/20 text-destructive text-[10px] flex items-center justify-center font-bold">
                    ✕
                  </span>
                )}
                <span className="truncate">
                  答：{a.studentAnswer || '（空白）'}・{formatRelativeTime(a.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => statusMutation.mutate('REVIEWING')}
          disabled={statusMutation.isPending}
          className="gap-1.5"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          重啟複習
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => statusMutation.mutate('MASTERED')}
          disabled={statusMutation.isPending}
          className="gap-1.5"
        >
          <CheckCircle className="h-3.5 w-3.5" aria-hidden="true" />
          標記已掌握
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => statusMutation.mutate('ARCHIVED')}
          disabled={statusMutation.isPending}
          className="gap-1.5"
        >
          <Archive className="h-3.5 w-3.5" aria-hidden="true" />
          歸檔
        </Button>
      </div>
    </div>
  )
}

export default function WrongQuestionsPage() {
  const [tab, setTab] = React.useState('all')
  const [searchInput, setSearchInput] = React.useState('')
  const [search, setSearch] = React.useState('')
  const [sort, setSort] = React.useState('recent')
  const [page, setPage] = React.useState(1)
  const [expandedId, setExpandedId] = React.useState<string | null>(null)
  const limit = 10

  const statusParam = tab === 'all' ? '' : `&status=${tab}`
  const searchParam = search ? `&search=${encodeURIComponent(search)}` : ''
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['student', 'wrong-questions', tab, search, sort, page],
    queryFn: () =>
      api.get<WrongList>(
        `/api/student/wrong-questions?page=${page}&limit=${limit}&sort=${sort}${statusParam}${searchParam}`
      ),
    retry: false,
  })

  const applySearch = () => {
    setSearch(searchInput.trim())
    setPage(1)
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">錯題本</h1>
        <p className="text-muted-foreground mt-1">每一次錯誤都是精準的學習資產</p>
      </div>

      {data && data.dueCount > 0 && (
        <Alert variant="info">
          <AlertDescription>
            📚 目前有 <span className="font-bold">{data.dueCount}</span> 題到了複習時間，建議今天複習
            {tab !== 'all' || search ? '' : ''}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <Tabs value={tab} onValueChange={(v) => { setTab(v); setPage(1); }} className="w-full md:w-auto">
          <TabsList className="flex-wrap h-auto">
            {STATUS_TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="flex gap-2 flex-1 md:justify-end">
          <div className="relative flex-1 md:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              placeholder="搜尋題目關鍵字…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') applySearch()
              }}
              className="pl-10"
            />
          </div>
          <Select value={sort} onValueChange={(v) => { setSort(v); setPage(1); }}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="排序" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">最近錯誤</SelectItem>
              <SelectItem value="errors">錯誤最多</SelectItem>
              <SelectItem value="review">複習優先</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16" role="status" aria-label="載入中">
          <Spinner size="lg" />
        </div>
      )}

      {isError && (
        <Alert variant="destructive">
          <AlertDescription className="flex flex-col gap-3">
            <span>載入錯題本失敗。</span>
            <span>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                重試
              </Button>
            </span>
          </AlertDescription>
        </Alert>
      )}

      {data && data.items.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-success-500/10 mx-auto mb-4">
              <Inbox className="h-8 w-8 text-success-500" aria-hidden="true" />
            </div>
            <p className="font-medium">太棒了，這裡沒有錯題！</p>
            <p className="text-sm text-muted-foreground mt-1">
              {tab === 'all' && !search
                ? '目前沒有任何錯題紀錄，去挑戰 Level 測驗吧'
                : '此篩選條件下沒有錯題，換個條件試試'}
            </p>
          </CardContent>
        </Card>
      )}

      {data && data.items.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">共 {data.total} 題</p>
          {data.items.map((w) => {
            const meta = STATUS_META[w.reviewStatus]
            const expanded = expandedId === w.id
            return (
              <Card key={w.id}>
                <CardHeader className="pb-2">
                  <button
                    className="flex items-start justify-between gap-3 text-left w-full"
                    onClick={() => setExpandedId(expanded ? null : w.id)}
                    aria-expanded={expanded}
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">{w.question.stem}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
                        <Badge variant={meta.variant}>{meta.label}</Badge>
                        <Badge variant="outline">錯 {w.errorCount} 次</Badge>
                        <Badge variant="outline">複習 {w.reviewCount} 次</Badge>
                        {w.question.knowledgePoints.slice(0, 2).map((k) => (
                          <Badge key={k.code} variant="outline">
                            {k.name}
                          </Badge>
                        ))}
                        <span className="text-muted-foreground">
                          最近錯誤 {formatRelativeTime(w.lastErrorAt)}
                        </span>
                      </div>
                    </div>
                    {expanded ? (
                      <ChevronUp className="h-5 w-5 flex-shrink-0 text-muted-foreground" aria-hidden="true" />
                    ) : (
                      <ChevronDown className="h-5 w-5 flex-shrink-0 text-muted-foreground" aria-hidden="true" />
                    )}
                  </button>
                </CardHeader>
                {expanded && (
                  <CardContent className={cn('pt-0')}>
                    <WrongDetailView
                      wrongId={w.id}
                      onChanged={() => refetch()}
                    />
                  </CardContent>
                )}
              </Card>
            )
          })}

          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-muted-foreground">
              第 {page} / {totalPages} 頁
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                上一頁
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                下一頁
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
