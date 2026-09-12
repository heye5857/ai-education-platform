'use client'

export const dynamic = 'force-dynamic'

import * as React from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, ArrowLeft } from 'lucide-react'

const errorMessages: Record<string, string> = {
  Configuration: '配置錯誤，請聯繫管理員',
  AccessDenied: '存取被拒絕，您可能沒有權限',
  Verification: '驗證失敗，請重試',
  OAuthSignin: 'OAuth 登入失敗，請重試',
  OAuthCallback: 'OAuth 回調錯誤，請重試',
  OAuthCreateAccount: '建立帳號失敗，請重試',
  EmailCreateAccount: '建立帳號失敗',
  Callback: '回調錯誤，請重試',
  OAuthAccountNotLinked: '此電子郵件已關聯其他登入方式',
  EmailSignin: '電子郵件登入失敗',
  CredentialsSignin: '電子郵件或密碼錯誤，請重試',
  SessionRequired: '請先登入',
  Default: '發生未知錯誤，請稍後再試',
}

export default function AuthErrorPage() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error') || 'Default'
  const errorMessage = errorMessages[error] || errorMessages.Default

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-math-50 via-background to-primary/5 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
            <AlertCircle className="h-10 w-10 text-destructive" aria-hidden="true" />
          </div>
        </div>

        <Card className="shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">發生錯誤</CardTitle>
            <CardDescription>{errorMessage}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" aria-hidden="true" />
              <AlertDescription>
                錯誤代碼：{error}
              </AlertDescription>
            </Alert>

            <div className="flex gap-3">
              <Button onClick={() => window.history.back()} className="flex-1 gap-2">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                返回上一頁
              </Button>
              <Button variant="outline" className="flex-1 gap-2" onClick={() => window.location.assign('/login')}>
                回到登入頁
              </Button>
            </div>

            <p className="text-center text-sm text-muted-foreground">
              認為這是系統錯誤？{' '}
              <a href="/contact" className="text-math-500 hover:underline">
                聯絡客服
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}