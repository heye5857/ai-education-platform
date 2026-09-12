'use client'

export const dynamic = 'force-dynamic'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ProgressRing } from '@/components/learning/ProgressRing'
import { LevelCard } from '@/components/learning/LevelCard'
import { Separator } from '@/components/ui/separator'
import { Lock } from 'lucide-react'
import { api, queryKeys } from '@/lib/api/client'

type ApiStatus = 'LOCKED' | 'AVAILABLE' | 'IN_PROGRESS' | 'COMPLETED' | 'MASTERED'
type CardStatus = 'locked' | 'available' | 'in-progress' | 'completed' | 'mastered'

const STATUS_MAP: Record<ApiStatus, CardStatus> = {
  LOCKED: 'locked',
  AVAILABLE: 'available',
  IN_PROGRESS: 'in-progress',
  COMPLETED: 'completed',
  MASTERED: 'mastered',
}

interface MapLevel {
  id: string
  levelNumber: number
  name: string
  description: string | null
  status: ApiStatus
  videoDuration: number | null
  cardCount: number
  completedCards: number
}

interface MapUnit {
  id: string
  code: string
  name: string
  description: string | null
  sortOrder: number
  levels: MapLevel[]
}

interface MapData {
  course: { id: string; code: string; name: string; description: string | null }
  units: MapUnit[]
}

export default function LearningMapPage() {
  const router = useRouter()

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.learning.map('me'),
    queryFn: () => api.get<MapData>('/api/learning/map'),
    retry: false,
  })

  const allLevels = React.useMemo(
    () => data?.units.flatMap((u) => u.levels) ?? [],
    [data]
  )
  const doneCount = allLevels.filter((l) => l.status === 'COMPLETED' || l.status === 'MASTERED').length
  const progress = allLevels.length > 0 ? Math.round((doneCount / allLevels.length) * 100) : 0

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
        <h1 className="text-3xl font-bold tracking-tight">學習地圖</h1>
        <Alert variant="destructive">
          <AlertDescription className="flex flex-col gap-3">
            <span>載入學習地圖失敗，此年級學期可能尚無課程。</span>
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

  return (
    <div className="space-y-8">
      <section className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{data.course.code}</p>
          <h1 className="text-3xl font-bold tracking-tight">{data.course.name}</h1>
          {data.course.description && (
            <p className="text-muted-foreground mt-1">{data.course.description}</p>
          )}
        </div>
        <div className="flex items-center gap-4">
          <ProgressRing progress={progress} size={72} variant="math" showPercentage />
          <div className="text-sm text-muted-foreground">
            <p>
              已完成 <span className="font-semibold text-foreground">{doneCount}</span> / {allLevels.length} 關
            </p>
          </div>
        </div>
      </section>

      {data.units.map((unit, unitIndex) => {
        const unitDone = unit.levels.filter(
          (l) => l.status === 'COMPLETED' || l.status === 'MASTERED'
        ).length
        const unitLocked = unit.levels.every((l) => l.status === 'LOCKED')
        return (
          <section key={unit.id} aria-labelledby={`unit-${unit.id}`} className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <Badge variant="math">單元 {unitIndex + 1}</Badge>
              <h2 id={`unit-${unit.id}`} className="text-xl font-semibold">
                {unit.name}
              </h2>
              {unitLocked && <Lock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
              <span className="text-sm text-muted-foreground">
                {unitDone}/{unit.levels.length} 關完成
              </span>
            </div>
            {unit.description && (
              <p className="text-sm text-muted-foreground">{unit.description}</p>
            )}
            <div className="grid gap-4 md:grid-cols-2">
              {unit.levels.map((level) => (
                <LevelCard
                  key={level.id}
                  levelNumber={level.levelNumber}
                  title={level.name}
                  description={level.description ?? undefined}
                  status={STATUS_MAP[level.status]}
                  videoDuration={level.videoDuration ?? undefined}
                  cardCount={level.cardCount}
                  completedCards={level.completedCards}
                  onClick={
                    level.status === 'LOCKED'
                      ? undefined
                      : () => router.push(`/dashboard/levels/${level.id}`)
                  }
                />
              ))}
            </div>
            {unitIndex < data.units.length - 1 && <Separator className="mt-2" />}
          </section>
        )
      })}

      {data.units.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            此課程尚無單元，敬請期待
          </CardContent>
        </Card>
      )}
    </div>
  )
}