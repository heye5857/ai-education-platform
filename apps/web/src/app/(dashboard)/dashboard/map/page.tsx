'use client'

export const dynamic = 'force-dynamic'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BookOpen } from 'lucide-react'

export default function LearningMapPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">學習地圖</h1>
        <p className="text-muted-foreground mt-1">依課綱設計的完整學習路徑</p>
      </div>
      <Card>
        <CardHeader className="text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-math-500/10 mx-auto mb-4">
            <BookOpen className="h-8 w-8 text-math-500" aria-hidden="true" />
          </div>
          <CardTitle>功能開發中</CardTitle>
          <CardDescription>學習地圖將在 Phase 4 推出，敬請期待</CardDescription>
        </CardHeader>
        <CardContent className="text-center text-sm text-muted-foreground">
          <p>Course → Unit → Level 架構、影片播放器、互動卡片、進度解鎖</p>
        </CardContent>
      </Card>
    </div>
  )
}