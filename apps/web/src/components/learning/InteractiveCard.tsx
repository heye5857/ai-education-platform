'use client'

import * as React from 'react'
import { useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Lightbulb, MessageCircle, PenLine, Presentation, CheckCircle } from 'lucide-react'
import { api } from '@/lib/api/client'
import { cn } from '@/lib/utils'

export type InteractiveCardType =
  | 'THOUGHT_QUESTION'
  | 'QNA'
  | 'MINI_PROBLEM'
  | 'TEACHING_INTERACTION'

export interface InteractiveCardData {
  id: string
  triggerTimeSeconds: number
  type: InteractiveCardType
  content: Record<string, unknown>
  sortOrder: number
  isRequired: boolean
  completed: boolean
}

interface AnswerResult {
  recorded: boolean
  isCorrect: boolean | null
  feedback: string
  correctAnswer?: string
}

const TYPE_META: Record<InteractiveCardType, { label: string; icon: React.ElementType }> = {
  THOUGHT_QUESTION: { label: '思考題', icon: Lightbulb },
  QNA: { label: '問答', icon: MessageCircle },
  MINI_PROBLEM: { label: '小試身手', icon: PenLine },
  TEACHING_INTERACTION: { label: '教學互動', icon: Presentation },
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

export function InteractiveCard({
  card,
  onAnswered,
}: {
  card: InteractiveCardData
  onAnswered?: () => void
}) {
  const [answer, setAnswer] = React.useState('')
  const [result, setResult] = React.useState<AnswerResult | null>(null)
  const meta = TYPE_META[card.type]
  const Icon = meta.icon

  const mutation = useMutation({
    mutationFn: (payload: { cardId: string; answer: string }) =>
      api.post<AnswerResult>('/api/learning/cards/answer', {
        cardId: payload.cardId,
        answer: payload.answer,
        timeSpentSeconds: 0,
      }),
    onSuccess: (data) => {
      setResult(data)
      onAnswered?.()
    },
  })

  const question = str(card.content.question)
  const hint = str(card.content.hint)
  const title = str(card.content.title) || meta.label
  const steps = Array.isArray(card.content.steps)
    ? card.content.steps.filter((s): s is string => typeof s === 'string')
    : []

  const submit = () => {
    if (card.type !== 'TEACHING_INTERACTION' && answer.trim().length === 0) return
    setResult(null)
    mutation.mutate({ cardId: card.id, answer: answer.trim() })
  }

  return (
    <Card className={cn(card.completed && 'border-success-500/40')}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="math" className="gap-1">
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {meta.label}
          </Badge>
          <span className="text-xs text-muted-foreground">
            影片 {formatTime(card.triggerTimeSeconds)} 處
          </span>
          {card.isRequired && <Badge variant="outline">必答</Badge>}
          {card.completed && (
            <Badge variant="success" className="gap-1">
              <CheckCircle className="h-3.5 w-3.5" aria-hidden="true" />
              已完成
            </Badge>
          )}
        </div>
        <CardTitle className="text-base mt-2">{question || title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {card.type === 'TEACHING_INTERACTION' && steps.length > 0 && (
          <ol className="space-y-1.5 text-sm text-muted-foreground list-decimal list-inside">
            {steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        )}

        {card.type === 'THOUGHT_QUESTION' && (
          <Textarea
            placeholder="寫下你的想法…"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            disabled={mutation.isPending || card.completed}
            rows={3}
          />
        )}

        {(card.type === 'QNA' || card.type === 'MINI_PROBLEM') && (
          <Input
            placeholder={card.type === 'MINI_PROBLEM' ? '請輸入答案…' : '請輸入你的回答…'}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            disabled={mutation.isPending || card.completed}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit()
            }}
          />
        )}

        {mutation.isError && (
          <Alert variant="destructive">
            <AlertDescription>送出失敗，請重試一次</AlertDescription>
          </Alert>
        )}

        {result && (
          <Alert variant={result.isCorrect === false ? 'destructive' : 'success'}>
            <AlertDescription>
              <p>{result.feedback}</p>
              {result.correctAnswer !== undefined && (
                <p className="mt-1 font-medium">正確答案：{result.correctAnswer}</p>
              )}
            </AlertDescription>
          </Alert>
        )}

        {!card.completed ? (
          <Button
            onClick={submit}
            disabled={
              mutation.isPending ||
              (card.type !== 'TEACHING_INTERACTION' && answer.trim().length === 0)
            }
            className="w-full sm:w-auto gap-2"
          >
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {card.type === 'TEACHING_INTERACTION'
              ? '我知道了'
              : card.type === 'MINI_PROBLEM'
                ? '送出答案'
                : '送出'}
          </Button>
        ) : (
          hint && (
            <p className="text-sm text-muted-foreground flex items-start gap-1.5">
              <Lightbulb className="h-4 w-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
              提示回顧：{hint}
            </p>
          )
        )}
      </CardContent>
    </Card>
  )
}
