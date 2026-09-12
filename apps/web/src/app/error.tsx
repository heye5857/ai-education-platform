'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { AlertCircle, RefreshCw, Home } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center space-y-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 mx-auto">
          <AlertCircle className="h-8 w-8 text-destructive" aria-hidden="true" />
        </div>
        <h2 className="text-xl font-semibold">發生錯誤</h2>
        <p className="text-muted-foreground">
          應用程式發生預期外的錯誤，我們已記錄此問題
        </p>
        <div className="flex gap-3 justify-center">
          <Button onClick={reset} variant="default" className="gap-2">
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            嘗試恢復
          </Button>
          <Button variant="outline" onClick={() => router.push('/dashboard')}>
            <Home className="h-4 w-4 mr-2" aria-hidden="true" />
            回到首頁
          </Button>
        </div>
        {process.env.NODE_ENV === 'development' && (
          <details className="text-left mt-4 p-4 bg-muted rounded-lg text-sm">
            <summary className="cursor-pointer font-medium mb-2">錯誤詳情</summary>
            <pre className="whitespace-pre-wrap text-destructive">{error.message}</pre>
            {error.digest && <p className="mt-2 text-xs text-muted-foreground">Digest: {error.digest}</p>}
          </details>
        )}
      </div>
    </div>
  )
}