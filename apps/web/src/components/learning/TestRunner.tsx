'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { ProgressRing } from '@/components/learning/ProgressRing'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/modal'
import { ArrowLeft, Flag, CheckCircle, XCircle, Loader2, RotateCcw } from 'lucide-react'
import { api } from '@/lib/api/client'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

export interface TestRunnerOption {
  id: string
  text: string
}

export interface TestRunnerQuestion {
  id: string
  type: string
  stem: string
  options: TestRunnerOption[] | null
  difficulty: number
}

export interface TestRunnerPaper {
  assessmentId: string
  levelId?: string
  grade?: number
  questionCount: number
  passScore?: number
  attemptNumber: number
  questions: TestRunnerQuestion[]
}

export interface TestRunnerResultItem {
  questionId: string
  studentAnswer: string
  isCorrect: boolean
  gradable: boolean
  correctAnswer: string
  solution: string[]
}

export interface TestRunnerResult {
  attemptId: string
  score: number
  maxScore: number
  percentage: number
  passed: boolean
  passScore: number
  wrongCount: number
  nextLevelId: string | null
  results: TestRunnerResultItem[]
}

export interface TestRunnerProps {
  queryKey: unknown[]
  startUrl: string
  submitUrl: string
  backHref: string
  backLabel?: string
  heading?: React.ReactNode
  /** 自訂結果標題（預設依 passed 顯示通過/再接再厲） */
  resultTitle?: (result: TestRunnerResult) => string
  /** 是否顯示通過標準（初始能力測驗不設通過線，隱藏） */
  showPassScore?: boolean
  /** 自訂結果頁按鈕區（預設只有「再考一次」） */
  renderResultActions?: (
    result: TestRunnerResult,
    helpers: { retry: () => void }
  ) => React.ReactNode
}

function formatElapsed(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export function TestRunner({
  queryKey,
  startUrl,
  submitUrl,
  backHref,
  backLabel = '返回',
  heading,
  resultTitle,
  showPassScore = true,
  renderResultActions,
}: TestRunnerProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const [currentIndex, setCurrentIndex] = React.useState(0)
  const [answers, setAnswers] = React.useState<Record<string, string>>({})
  const [marked, setMarked] = React.useState<Set<string>>(new Set())
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [result, setResult] = React.useState<TestRunnerResult | null>(null)
  const [elapsed, setElapsed] = React.useState(0)
  const startRef = React.useRef<number>(Date.now())

  const paperQuery = useQuery({
    queryKey,
    queryFn: () => api.get<TestRunnerPaper>(startUrl),
    retry: false,
  })

  // 作答計時（無時間限制，僅記錄用時）
  React.useEffect(() => {
    if (result) return
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000))
    }, 1000)
    return () => clearInterval(timer)
  }, [result])

  const submitMutation = useMutation({
    mutationFn: (payload: {
      assessmentId: string
      answers: Array<{ questionId: string; answer: string; timeSpentSeconds: number; hintsUsed: number }>
      timeSpentSeconds: number
    }) => api.post<TestRunnerResult>(submitUrl, payload),
    onSuccess: async (data) => {
      setResult(data)
      setConfirmOpen(false)
      await queryClient.invalidateQueries({ queryKey: ['learning', 'map', 'me'] })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    },
    onError: () => {
      toast({ title: '送出失敗', description: '請檢查網路後重試', variant: 'destructive' })
      setConfirmOpen(false)
    },
  })

  const paper = paperQuery.data
  const questions = paper?.questions ?? []
  const current = questions[currentIndex]
  const answeredCount = questions.filter((q) => (answers[q.id] ?? '').trim().length > 0).length
  const unansweredCount = questions.length - answeredCount

  const setAnswer = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
  }

  const toggleMulti = (questionId: string, optionId: string) => {
    let selected: string[] = []
    try {
      const raw: unknown = JSON.parse(answers[questionId] || '[]')
      if (Array.isArray(raw)) selected = raw.filter((v): v is string => typeof v === 'string')
    } catch {
      selected = []
    }
    const next = selected.includes(optionId)
      ? selected.filter((v) => v !== optionId)
      : [...selected, optionId]
    setAnswer(questionId, JSON.stringify(next.sort()))
  }

  const toggleMark = (questionId: string) => {
    setMarked((prev) => {
      const next = new Set(prev)
      if (next.has(questionId)) next.delete(questionId)
      else next.add(questionId)
      return next
    })
  }

  const handleSubmit = () => {
    if (!paper) return
    const perQuestion = Math.max(1, Math.floor(Math.max(elapsed, 1) / Math.max(questions.length, 1)))
    submitMutation.mutate({
      assessmentId: paper.assessmentId,
      answers: questions.map((q) => ({
        questionId: q.id,
        answer: (answers[q.id] ?? '').trim(),
        timeSpentSeconds: perQuestion,
        hintsUsed: 0,
      })),
      timeSpentSeconds: Math.max(elapsed, 1),
    })
  }

  const handleRetry = async () => {
    setResult(null)
    setAnswers({})
    setMarked(new Set())
    setCurrentIndex(0)
    setElapsed(0)
    startRef.current = Date.now()
    await paperQuery.refetch()
  }

  if (paperQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-24" role="status" aria-label="載入試卷中">
        <Spinner size="lg" />
      </div>
    )
  }

  if (paperQuery.isError || !paper) {
    return (
      <div className="space-y-6 max-w-2xl">
        {heading}
        <Button variant="ghost" size="sm" onClick={() => router.push(backHref)}>
          <ArrowLeft className="h-4 w-4 mr-1" aria-hidden="true" />
          {backLabel}
        </Button>
        <Alert variant="destructive">
          <AlertDescription className="flex flex-col gap-3">
            <span>載入試卷失敗，可能尚無測驗題目。</span>
            <span>
              <Button variant="outline" size="sm" onClick={() => paperQuery.refetch()}>
                重試
              </Button>
            </span>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // 結果頁
  if (result) {
    return (
      <div className="space-y-6 max-w-3xl">
        {heading}
        <Card className={cn(result.passed ? 'border-success-500/40' : 'border-warning-500/40')}>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-2">
              <ProgressRing
                progress={result.percentage}
                size={120}
                variant={result.passed ? 'success' : 'warning'}
                showPercentage
              />
            </div>
            <CardTitle className="text-2xl">
              {resultTitle ? resultTitle(result) : result.passed ? '通過！🎉' : '再接再厲💪'}
            </CardTitle>
            <p className="text-muted-foreground">
              得分 {result.score} / {result.maxScore}
              {showPassScore && `（通過標準 ${result.passScore} 分）`}
              {result.wrongCount > 0 && `・錯 ${result.wrongCount} 題已收錄進錯題本`}
            </p>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 justify-center">
            {renderResultActions ? (
              renderResultActions(result, { retry: handleRetry })
            ) : (
              <Button variant="outline" onClick={handleRetry} className="gap-2">
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                再考一次
              </Button>
            )}
          </CardContent>
        </Card>

        <h2 className="text-xl font-semibold">逐題解析</h2>
        <div className="space-y-4">
          {result.results.map((r, i) => {
            const q = questions.find((qq) => qq.id === r.questionId)
            return (
              <Card key={r.questionId} className={cn(r.isCorrect ? 'border-success-500/30' : 'border-destructive/30')}>
                <CardHeader className="pb-2">
                  <div className="flex items-start gap-2">
                    {r.isCorrect ? (
                      <CheckCircle className="h-5 w-5 text-success-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
                    ) : (
                      <XCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" aria-hidden="true" />
                    )}
                    <div>
                      <p className="font-medium">
                        第 {i + 1} 題：{q?.stem ?? r.questionId}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        你的答案：{r.studentAnswer || '（未作答）'}
                        {!r.isCorrect && `　｜　正確答案：${r.correctAnswer}`}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                {r.solution.length > 0 && (
                  <CardContent className="pt-0">
                    <p className="text-sm font-medium mb-1">解析：</p>
                    <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                      {r.solution.map((s, j) => (
                        <li key={j}>{s}</li>
                      ))}
                    </ol>
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      </div>
    )
  }

  // 作答頁
  return (
    <div className="space-y-6 max-w-3xl">
      {heading}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push(backHref)}>
          <ArrowLeft className="h-4 w-4 mr-1" aria-hidden="true" />
          {backLabel}
        </Button>
        <div className="flex items-center gap-3 text-sm">
          <Badge variant="outline">第 {paper.attemptNumber} 次挑戰</Badge>
          <Badge variant="math">作答時間 {formatElapsed(elapsed)}</Badge>
        </div>
      </div>

      <div>
        <div className="flex justify-between text-sm mb-1.5">
          <span className="text-muted-foreground">
            第 {currentIndex + 1} / {questions.length} 題（已答 {answeredCount}）
          </span>
          {showPassScore && typeof paper.passScore === 'number' && (
            <span className="text-muted-foreground">滿分 {questions.length * 10} 分制・{paper.passScore} 分通過</span>
          )}
        </div>
        <Progress value={questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0} variant="math" />
      </div>

      {/* 題號導航 */}
      <div className="flex flex-wrap gap-2" role="navigation" aria-label="題號導航">
        {questions.map((q, i) => {
          const answered = (answers[q.id] ?? '').trim().length > 0
          return (
            <Button
              key={q.id}
              variant={i === currentIndex ? 'default' : 'outline'}
              size="icon"
              className={cn(
                'relative h-9 w-9',
                answered && i !== currentIndex && 'border-success-500 text-success-600'
              )}
              onClick={() => setCurrentIndex(i)}
              aria-label={`第 ${i + 1} 題${answered ? '（已答）' : ''}`}
            >
              {i + 1}
              {marked.has(q.id) && (
                <Flag className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 text-warning-500 fill-warning-500" aria-hidden="true" />
              )}
            </Button>
          )
        })}
      </div>

      {current && (
        <Card key={current.id}>
          <CardHeader>
            <CardTitle className="text-lg">
              第 {currentIndex + 1} 題
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {current.type === 'SINGLE_CHOICE' && '單選'}
                {current.type === 'MULTIPLE_CHOICE' && '多選'}
                {current.type === 'FILL_BLANK' && '填空'}
                {current.type === 'SHORT_ANSWER' && '簡答'}
              </span>
            </CardTitle>
            <p className="text-base mt-2">{current.stem}</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {current.type === 'SINGLE_CHOICE' && current.options && (
              <div className="grid gap-2">
                {current.options.map((opt) => {
                  const selected = answers[current.id] === opt.id
                  return (
                    <Button
                      key={opt.id}
                      variant={selected ? 'default' : 'outline'}
                      className="justify-start h-auto py-3 px-4 text-left"
                      onClick={() => setAnswer(current.id, opt.id)}
                    >
                      <span className="font-bold mr-2">{opt.id}.</span> {opt.text}
                    </Button>
                  )
                })}
              </div>
            )}
            {current.type === 'MULTIPLE_CHOICE' && current.options && (
              <div className="grid gap-2">
                {current.options.map((opt) => {
                  let selected: string[] = []
                  try {
                    const raw: unknown = JSON.parse(answers[current.id] || '[]')
                    if (Array.isArray(raw)) selected = raw.filter((v): v is string => typeof v === 'string')
                  } catch {
                    selected = []
                  }
                  const on = selected.includes(opt.id)
                  return (
                    <Button
                      key={opt.id}
                      variant={on ? 'default' : 'outline'}
                      className="justify-start h-auto py-3 px-4 text-left"
                      onClick={() => toggleMulti(current.id, opt.id)}
                    >
                      <span className="font-bold mr-2">{on ? '☑' : '☐'} {opt.id}.</span> {opt.text}
                    </Button>
                  )
                })}
                <p className="text-xs text-muted-foreground">可複選，需全對才得分</p>
              </div>
            )}
            {(current.type === 'FILL_BLANK' || current.type === 'SHORT_ANSWER') && (
              <Input
                placeholder="請輸入答案…"
                value={answers[current.id] ?? ''}
                onChange={(e) => setAnswer(current.id, e.target.value)}
              />
            )}
            <div className="flex justify-between items-center pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleMark(current.id)}
                className={cn(marked.has(current.id) && 'text-warning-500')}
              >
                <Flag className="h-4 w-4 mr-1" aria-hidden="true" />
                {marked.has(current.id) ? '取消標記' : '標記複習'}
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                >
                  上一題
                </Button>
                {currentIndex < questions.length - 1 ? (
                  <Button onClick={() => setCurrentIndex((i) => i + 1)}>下一題</Button>
                ) : (
                  <Button variant="math" onClick={() => setConfirmOpen(true)}>
                    交卷
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button
          variant="math"
          size="lg"
          onClick={() => setConfirmOpen(true)}
          disabled={submitMutation.isPending}
          className="gap-2"
        >
          {submitMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          交卷送出（已答 {answeredCount}/{questions.length}）
        </Button>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>確定要交卷嗎？</DialogTitle>
            <DialogDescription>
              {unansweredCount > 0
                ? `還有 ${unansweredCount} 題未作答（將以空白計分），確定送出？`
                : `全部 ${questions.length} 題皆已作答，送出後立即評分。`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              繼續作答
            </Button>
            <Button onClick={handleSubmit} disabled={submitMutation.isPending}>
              {submitMutation.isPending ? '評分中…' : '確定交卷'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {submitMutation.isError && (
        <Alert variant="destructive">
          <AlertDescription>送出失敗，請檢查網路後重試</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
