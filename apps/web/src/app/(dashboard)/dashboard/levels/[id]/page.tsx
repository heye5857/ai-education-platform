'use client'

export const dynamic = 'force-dynamic'

import * as React from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { VideoPlayer } from '@/components/learning/VideoPlayer'
import { ArrowLeft, Play, Lock, CheckCircle, Star, Clock, MonitorPlay } from 'lucide-react'
import { api, queryKeys } from '@/lib/api/client'
import { useToast } from '@/hooks/use-toast'

type ApiStatus = 'LOCKED' | 'AVAILABLE' | 'IN_PROGRESS' | 'COMPLETED' | 'MASTERED'

interface LevelDetail {
  level: {
    id: string
    levelNumber: number
    name: string
    description: string | null
    passScore: number
    questionCount: number
  }
  unit: { id: string; code: string; name: string }
  course: { id: string; code: string; name: string }
  video: { id: string; url: string; title: string; durationSeconds: number } | null
  cardCount: number
  progress: {
    status: ApiStatus
    videoProgress: number
    cardsCompleted: unknown
    testAttempts: number
  } | null
  status: ApiStatus
  prevLevelId: string | null
  nextLevelId: string | null
}

const STATUS_META: Record<ApiStatus, { label: string; variant: 'default' | 'secondary' | 'success' | 'warning' | 'math'; icon: React.ElementType }> = {
  LOCKED: { label: '尚未解鎖', variant: 'secondary', icon: Lock },
  AVAILABLE: { label: '可開始學習', variant: 'math', icon: Play },
  IN_PROGRESS: { label: '學習中', variant: 'default', icon: Clock },
  COMPLETED: { label: '已完成', variant: 'success', icon: CheckCircle },
  MASTERED: { label: '已精通', variant: 'warning', icon: Star },
}

export default function LevelDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const levelId = params.id
  const lastSentRef = React.useRef(0)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.learning.level(levelId),
    queryFn: () => api.get<LevelDetail>(`/api/learning/levels/${levelId}`),
    retry: false,
  })

  const startMutation = useMutation({
    mutationFn: () =>
      api.post<{ progress: unknown }>('/api/learning/progress', { levelId }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.learning.level(levelId) })
      await queryClient.invalidateQueries({ queryKey: queryKeys.learning.map('me') })
      toast({ title: '已開始學習', description: '祝學習愉快，加油！' })
    },
    onError: () => {
      toast({ title: '開始失敗', description: '請確認前一關已完成後再試', variant: 'destructive' })
    },
  })

  const progressMutation = useMutation({
    mutationFn: (videoProgress: number) =>
      api.patch<{ progress: unknown }>('/api/learning/progress', { levelId, videoProgress }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.learning.level(levelId) })
    },
  })

  const handleTimeUpdate = React.useCallback(
    (seconds: number) => {
      const duration = data?.video?.durationSeconds ?? 0
      if (!duration || !data?.progress) return
      const percent = Math.min(100, Math.round((seconds / duration) * 100))
      if (percent - lastSentRef.current >= 10) {
        lastSentRef.current = percent
        progressMutation.mutate(percent)
      }
    },
    [data?.video?.durationSeconds, data?.progress, progressMutation]
  )

  const handleEnded = React.useCallback(() => {
    lastSentRef.current = 100
    progressMutation.mutate(100)
  }, [progressMutation])

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
        <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/map')}>
          <ArrowLeft className="h-4 w-4 mr-1" aria-hidden="true" />
          回學習地圖
        </Button>
        <Alert variant="destructive">
          <AlertDescription className="flex flex-col gap-3">
            <span>載入關卡失敗，關卡可能不存在或尚未解鎖。</span>
            <span className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                重試
              </Button>
              <Button variant="default" size="sm" onClick={() => router.push('/dashboard/map')}>
                回學習地圖
              </Button>
            </span>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const meta = STATUS_META[data.status]
  const StatusIcon = meta.icon
  const started = !!data.progress

  return (
    <div className="space-y-6 max-w-4xl">
      <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/map')}>
        <ArrowLeft className="h-4 w-4 mr-1" aria-hidden="true" />
        回學習地圖
      </Button>

      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            {data.course.name} / {data.unit.name}
          </p>
          <h1 className="text-3xl font-bold tracking-tight mt-1">
            Level {data.level.levelNumber}：{data.level.name}
          </h1>
          {data.level.description && (
            <p className="text-muted-foreground mt-1">{data.level.description}</p>
          )}
        </div>
        <Badge variant={meta.variant} className="gap-1.5 text-sm px-3 py-1">
          <StatusIcon className="h-4 w-4" aria-hidden="true" />
          {meta.label}
        </Badge>
      </div>

      {data.status === 'LOCKED' && (
        <Alert variant="info">
          <AlertDescription className="flex items-start gap-2">
            <Lock className="h-4 w-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
            <span>此關卡尚未解鎖，請先完成前一關後再回來。</span>
          </AlertDescription>
        </Alert>
      )}

      {/* 影片區 */}
      <section aria-label="教學影片">
        {data.video?.url ? (
          <VideoPlayer
            src={data.video.url}
            title={data.video.title}
            duration={data.video.durationSeconds}
            onTimeUpdate={started ? handleTimeUpdate : undefined}
            onEnded={started ? handleEnded : undefined}
          />
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-math-500/10 mx-auto mb-4">
                <MonitorPlay className="h-8 w-8 text-math-500" aria-hidden="true" />
              </div>
              <p className="font-medium">教學影片製作中</p>
              <p className="text-sm text-muted-foreground mt-1">
                內容團隊正在錄製本關影片，敬請期待
              </p>
            </CardContent>
          </Card>
        )}
      </section>

      {/* 進度區 */}
      <section aria-label="學習進度">
        <Card>
          <CardHeader>
            <CardTitle>學習進度</CardTitle>
            <CardDescription>
              測驗需 {data.level.questionCount} 題、{data.level.passScore} 分通過（Phase 5 推出）
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-muted-foreground">影片進度</span>
                <span className="font-medium">{data.progress?.videoProgress ?? 0}%</span>
              </div>
              <Progress value={data.progress?.videoProgress ?? 0} variant="math" />
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
              <span>互動卡片 {data.cardCount} 張</span>
              <Separator orientation="vertical" className="h-4" />
              <span>測驗作答 {data.progress?.testAttempts ?? 0} 次</span>
            </div>
            {!started && data.status !== 'LOCKED' && (
              <Button
                variant="math"
                className="w-full sm:w-auto gap-2"
                onClick={() => startMutation.mutate()}
                disabled={startMutation.isPending}
              >
                <Play className="h-4 w-4" aria-hidden="true" />
                {startMutation.isPending ? '開始中…' : '開始學習'}
              </Button>
            )}
          </CardContent>
        </Card>
      </section>

      {/* 互動卡片區（B-4 接作答功能） */}
      <section aria-label="互動卡片">
        <h2 className="text-xl font-semibold mb-4">互動卡片</h2>
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            {data.cardCount > 0
              ? `本關有 ${data.cardCount} 張互動卡片，作答功能即將推出`
              : '本關暫無互動卡片'}
          </CardContent>
        </Card>
      </section>

      {/* 上下關導航 */}
      <nav className="flex justify-between gap-4" aria-label="關卡導航">
        <Button
          variant="outline"
          disabled={!data.prevLevelId}
          onClick={() => data.prevLevelId && router.push(`/dashboard/levels/${data.prevLevelId}`)}
        >
          ← 上一關
        </Button>
        <Button
          variant="outline"
          disabled={!data.nextLevelId}
          onClick={() => data.nextLevelId && router.push(`/dashboard/levels/${data.nextLevelId}`)}
        >
          下一關 →
        </Button>
      </nav>
    </div>
  )
}
