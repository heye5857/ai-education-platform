'use client'

export const dynamic = 'force-dynamic'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { TrendingUp, TrendingDown, Target, MessageSquare, FolderOpen } from 'lucide-react'
import { api } from '@/lib/api/client'
import { cn } from '@/lib/utils'

interface AnalysisData {
  overview: {
    totalAttempts: number
    accuracy: number
    wrongPending: number
    conversationsActive: number
    levelsCompleted: number
    knowledgePointsTracked: number
  }
  domainMastery: Array<{ domain: string; avg: number; count: number }>
  weak: Array<{ code: string; name: string; topic: string; masteryScore: number; attemptCount: number }>
  strong: Array<{ code: string; name: string; topic: string; masteryScore: number; attemptCount: number }>
  errorByDomain: Array<{ domain: string; count: number }>
  trend: Array<{ date: string; total: number; correct: number }>
}

const DOMAIN_LABELS: Record<string, string> = {
  ALGEBRA: '代數',
  GEOMETRY: '幾何',
  STATISTICS: '統計',
  NUMBER: '數與量',
  FUNCTION: '函數',
  PROBABILITY: '機率',
  CALCULUS: '微積分',
  TRIGONOMETRY: '三角',
  VECTOR: '向量',
  LOGIC: '邏輯',
}

function masteryColor(score: number): string {
  if (score < 40) return 'text-destructive'
  if (score < 70) return 'text-warning-500'
  return 'text-success-500'
}

function masteryBar(score: number): string {
  if (score < 40) return 'bg-destructive'
  if (score < 70) return 'bg-warning-500'
  return 'bg-success-500'
}

export default function AnalysisPage() {
  const router = useRouter()

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['student', 'analysis', 'me'],
    queryFn: () => api.get<AnalysisData>('/api/student/analysis'),
    retry: false,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24" role="status" aria-label="載入中">
        <Spinner size="lg" />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">學習分析</h1>
        <Alert variant="destructive">
          <AlertDescription className="flex flex-col gap-3">
            <span>載入學習分析失敗。</span>
            <span>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                重試
              </Button>
            </span>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const maxTrend = Math.max(1, ...data.trend.map((t) => t.total))
  const hasData = data.overview.totalAttempts > 0

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">學習分析</h1>
        <p className="text-muted-foreground mt-1">掌握度追蹤、薄弱環節與學習趨勢</p>
      </div>

      {!hasData && (
        <Alert variant="info">
          <AlertDescription>
            尚無作答紀錄，先去完成一關測驗或回答互動卡片，這裡就會長出你的學習畫像 📊
          </AlertDescription>
        </Alert>
      )}

      {/* 總覽 */}
      <section aria-label="總覽" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: '總作答', value: String(data.overview.totalAttempts), sub: `答對率 ${data.overview.accuracy}%` },
          { label: '待複習錯題', value: String(data.overview.wrongPending), sub: '錯題本待處理' },
          { label: '完成關卡', value: String(data.overview.levelsCompleted), sub: '測驗通過累計' },
          { label: '追蹤知識點', value: String(data.overview.knowledgePointsTracked), sub: `${data.overview.conversationsActive} 個進行中對話` },
        ].map((c) => (
          <Card key={c.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{c.value}</div>
              <p className="text-sm text-muted-foreground mt-1">{c.sub}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      {/* 領域掌握度 */}
      <section aria-label="領域掌握度">
        <h2 className="text-xl font-semibold mb-4">各領域掌握度</h2>
        {data.domainMastery.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              尚無掌握度資料，完成測驗後自動計算
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-6 space-y-4">
              {data.domainMastery.map((d) => (
                <div key={d.domain}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-medium">
                      {DOMAIN_LABELS[d.domain] ?? d.domain}
                      <span className="ml-2 text-muted-foreground font-normal">{d.count} 個知識點</span>
                    </span>
                    <span className={cn('font-bold', masteryColor(d.avg))}>{d.avg}</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-secondary overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all', masteryBar(d.avg))}
                      style={{ width: `${Math.min(100, Math.max(0, d.avg))}%` }}
                    />
                  </div>
                </div>
              ))}
              <p className="text-xs text-muted-foreground">紅 0-40 待加強・黃 40-70  progress 中・綠 70-100 穩固</p>
            </CardContent>
          </Card>
        )}
      </section>

      {/* 弱項 / 強項 */}
      <section aria-label="弱項強項" className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-destructive" aria-hidden="true" />
              待加強 Top 5
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.weak.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">尚無資料</p>
            ) : (
              <ul className="space-y-2.5">
                {data.weak.map((k) => (
                  <li key={k.code} className="flex items-center justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{k.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {k.topic}・作答 {k.attemptCount} 次
                      </p>
                    </div>
                    <Badge variant={k.masteryScore < 40 ? 'destructive' : 'warning'} className="flex-shrink-0">
                      {k.masteryScore}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-success-500" aria-hidden="true" />
              強項 Top 5
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.strong.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">尚無資料</p>
            ) : (
              <ul className="space-y-2.5">
                {data.strong.map((k) => (
                  <li key={k.code} className="flex items-center justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{k.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {k.topic}・作答 {k.attemptCount} 次
                      </p>
                    </div>
                    <Badge variant={k.masteryScore >= 70 ? 'success' : 'warning'} className="flex-shrink-0">
                      {k.masteryScore}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      {/* 近 7 天趨勢 */}
      <section aria-label="作答趨勢">
        <h2 className="text-xl font-semibold mb-4">近 7 天作答趨勢</h2>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-end gap-2 h-32">
              {data.trend.map((t) => (
                <div key={t.date} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                  <span className="text-xs text-muted-foreground">{t.total > 0 ? t.total : ''}</span>
                  <div
                    className="w-full max-w-10 rounded-t bg-math-500/80 min-h-[4px]"
                    style={{ height: `${Math.max(t.total > 0 ? 6 : 4, (t.total / maxTrend) * 100)}%` }}
                    title={`${t.date}：${t.total} 題（對 ${t.correct}）`}
                  />
                  <span className="text-[10px] text-muted-foreground">{t.date.slice(5)}</span>
                </div>
              ))}
            </div>
            <Progress value={data.overview.accuracy} variant="math" className="mt-4" />
            <p className="text-xs text-muted-foreground mt-1">整體答對率 {data.overview.accuracy}%</p>
          </CardContent>
        </Card>
      </section>

      {/* 行動 */}
      <section aria-label="建議行動" className="grid gap-4 sm:grid-cols-3">
        <Button variant="outline" className="h-auto py-4 flex-col gap-1" onClick={() => router.push('/dashboard/wrong-questions')}>
          <FolderOpen className="h-5 w-5" aria-hidden="true" />
          複習錯題（{data.overview.wrongPending}）
        </Button>
        <Button variant="outline" className="h-auto py-4 flex-col gap-1" onClick={() => router.push('/dashboard/chat')}>
          <MessageSquare className="h-5 w-5" aria-hidden="true" />
          問 AI 老師
        </Button>
        <Button variant="math" className="h-auto py-4 flex-col gap-1" onClick={() => router.push('/dashboard/map')}>
          <Target className="h-5 w-5" aria-hidden="true" />
          繼續闖關
        </Button>
      </section>
    </div>
  )
}
