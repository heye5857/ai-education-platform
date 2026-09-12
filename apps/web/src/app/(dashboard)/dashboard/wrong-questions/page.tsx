'use client'

export const dynamic = 'force-dynamic'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FolderOpen } from 'lucide-react'

export default function WrongQuestionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">錯題本</h1>
        <p className="text-muted-foreground mt-1">自動收集錯題，智慧複習提醒</p>
      </div>
      <Card>
        <CardHeader className="text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 mx-auto mb-4">
            <FolderOpen className="h-8 w-8 text-destructive" aria-hidden="true" />
          </div>
          <CardTitle>功能開發中</CardTitle>
          <CardDescription>錯題本將在 Phase 6 推出，敬請期待</CardDescription>
        </CardHeader>
        <CardContent className="text-center text-sm text-muted-foreground">
          <p>錯題自動同步、複習模式、相似題推薦、錯誤類型分析</p>
        </CardContent>
      </Card>
    </div>
  )
}