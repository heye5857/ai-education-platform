'use client'

export const dynamic = 'force-dynamic'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Settings } from 'lucide-react'

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">設定</h1>
        <p className="text-muted-foreground mt-1">帳號與偏好設定</p>
      </div>
      <Card>
        <CardHeader className="text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mx-auto mb-4">
            <Settings className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
          </div>
          <CardTitle>功能開發中</CardTitle>
          <CardDescription>設定頁面規劃中，敬請期待</CardDescription>
        </CardHeader>
        <CardContent className="text-center text-sm text-muted-foreground">
          <p>通知設定、主題切換、語言偏好</p>
        </CardContent>
      </Card>
    </div>
  )
}