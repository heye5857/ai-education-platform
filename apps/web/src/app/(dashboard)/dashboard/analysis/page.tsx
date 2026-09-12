'use client'

export const dynamic = 'force-dynamic'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart } from 'lucide-react'

export default function AnalysisPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">學習分析</h1>
        <p className="text-muted-foreground mt-1">即時掌握度追蹤與個人化建議</p>
      </div>
      <Card>
        <CardHeader className="text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-success-500/10 mx-auto mb-4">
            <BarChart className="h-8 w-8 text-success-500" aria-hidden="true" />
          </div>
          <CardTitle>功能開發中</CardTitle>
          <CardDescription>學習分析將在 Phase 6 推出，敬請期待</CardDescription>
        </CardHeader>
        <CardContent className="text-center text-sm text-muted-foreground">
          <p>Mastery 掌握度、薄弱環節分析、學習習慣洞察</p>
        </CardContent>
      </Card>
    </div>
  )
}