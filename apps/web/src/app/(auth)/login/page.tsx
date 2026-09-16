'use client'

export const dynamic = 'force-dynamic'

import * as React from 'react'
import { signIn } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, BookOpen } from 'lucide-react'

export default function LoginPage() {
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'
  const error = searchParams.get('error')

  const [isLoading, setIsLoading] = React.useState(false)

  const handleGoogleSignIn = () => {
    setIsLoading(true)
    signIn('google', { callbackUrl })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-math-50 via-background to-primary/5 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-math-500">
            <BookOpen className="h-10 w-10 text-white" aria-hidden="true" />
          </div>
        </div>

        <Card className="shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">歡迎回來</CardTitle>
            <CardDescription>使用 Google 帳號登入以繼續學習</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Error message */}
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>
                  {error === 'CredentialsSignin'
                    ? '電子郵件或密碼錯誤，請重試'
                    : error === 'OAuthAccountNotLinked'
                    ? '此電子郵件已關聯其他登入方式'
                    : '登入失敗，請稍後再試'}
                </AlertDescription>
              </Alert>
            )}

            {/* Google Sign In */}
            <Button
              size="lg"
              className="w-full gap-2"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                  登入中...
                </>
              ) : (
                <>
                  <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  使用 Google 登入
                </>
              )}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              <p>本平台採用 Google 帳號登入，無需設定密碼</p>
              <p className="mt-1">首次登入會自動建立帳號並進入新手引導</p>
            </div>
          </CardContent>
        </Card>

        {/* Features hint */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>功能預覽：</p>
          <div className="flex justify-center gap-4 mt-2 flex-wrap">
            <span className="px-3 py-1 bg-math-50 text-math-700 rounded-full">學習地圖</span>
            <span className="px-3 py-1 bg-math-50 text-math-700 rounded-full">AI 問答</span>
            <span className="px-3 py-1 bg-math-50 text-math-700 rounded-full">錯題本</span>
            <span className="px-3 py-1 bg-math-50 text-math-700 rounded-full">學習分析</span>
          </div>
        </div>
      </div>
    </div>
  )
}