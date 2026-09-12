'use client'

export const dynamic = 'force-dynamic'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Trophy } from 'lucide-react'

export default function AchievementsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">成就系統</h1>
        <p className="text-muted-foreground mt-1">學習里程碑獎勵</p>
      </div>
      <Card>
        <CardHeader className="text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-warning-500/10 mx-auto mb-4">
            <Trophy className="h-8 w-8 text-warning-500" aria-hidden="true" />
          </div>
          <CardTitle>功能開發中</CardTitle>
          <CardDescription>成就系統規劃中，敬請期待</CardDescription>
        </CardHeader>
        <CardContent className="text-center text-sm text-muted-foreground">
          <p>學習里程碑、連續學習獎勵、排行榜</p>
        </CardContent>
      </Card>
    </div>
  )
}