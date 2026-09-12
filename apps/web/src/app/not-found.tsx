'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { FileQuestion, Home, Search } from 'lucide-react'

export default function NotFound() {
  const router = useRouter()
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-muted mx-auto">
          <FileQuestion className="h-12 w-12 text-muted-foreground" aria-hidden="true" />
        </div>
        <div className="space-y-2">
          <h1 className="text-4xl font-bold">404</h1>
          <h2 className="text-xl font-semibold">找不到頁面</h2>
          <p className="text-muted-foreground">
            抱歉，您尋找的頁面不存在或已被移動
          </p>
        </div>
        <div className="flex gap-3 justify-center flex-wrap">
          <Button variant="default" className="gap-2" onClick={() => router.push('/dashboard')}>
            <Home className="h-4 w-4" aria-hidden="true" />
            回到首頁
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => router.push('/dashboard/map')}>
            <Search className="h-4 w-4" aria-hidden="true" />
            瀏覽學習地圖
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          認為這是錯誤？<a href="/contact" className="text-math-500 hover:underline">聯絡我們</a>
        </p>
      </div>
    </div>
  )
}