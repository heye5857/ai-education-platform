'use client'

export const dynamic = 'force-dynamic'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Sparkles } from 'lucide-react'

export default function FeaturesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">全部功能</h1>
        <p className="text-muted-foreground mt-1">瀏覽平台所有功能</p>
      </div>
      <Card>
        <CardHeader className="text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mx-auto mb-4">
            <Sparkles className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
          </div>
          <CardTitle>功能開發中</CardTitle>
          <CardDescription>完整功能總覽規劃中，敬請期待</CardDescription>
        </CardHeader>
        <CardContent className="text-center text-sm text-muted-foreground">
          <p>請先回到首頁查看核心功能</p>
        </CardContent>
      </Card>
    </div>
  )
}