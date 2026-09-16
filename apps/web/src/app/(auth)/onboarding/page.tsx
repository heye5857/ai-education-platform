'use client'

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { SuspenseWrapper } from '@/components/SuspenseWrapper'
import { Spinner } from '@/components/ui/spinner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, BookOpen, GraduationCap, Building, User, ChevronLeft, ChevronRight } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { onboardingSchema, type OnboardingInput } from '@/lib/validations/schemas'
import { cn } from '@/lib/utils'
import { GRADES, SEMESTERS } from '@/lib/semester'

export const dynamic = 'force-dynamic'

function OnboardingPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'
  const { status, update } = useSession()

  const [step, setStep] = React.useState(1)
  const [isLoading, setIsLoading] = React.useState(false)
  const [submitError, setSubmitError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/onboarding')
    }
  }, [status, router])

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<OnboardingInput>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      name: '',
      school: '',
      grade: 7,
      className: '',
      semester: 1,
      agreedToTerms: false,
      agreedToPrivacy: false,
    },
  })

  const watchedValues = watch()

  const totalSteps = 3

  const nextStep = async () => {
    // 只驗證當前步驟的欄位，通過才前進（isValid 涵蓋全表單，不適用多步驟）
    const fields = steps[step - 1].fields as (keyof OnboardingInput)[]
    const ok = await trigger(fields)
    if (ok && step < totalSteps) setStep(step + 1)
  }

  const prevStep = () => {
    if (step > 1) setStep(step - 1)
  }

  const onSubmit = async (data: OnboardingInput) => {
    setIsLoading(true)
    setSubmitError(null)
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => null)
        throw new Error((errorData as { message?: string } | null)?.message ?? '設定失敗，請稍後再試')
      }

      await update()
      router.push(callbackUrl)
      router.refresh()
    } catch (err) {
      console.error('Onboarding failed:', err)
      setSubmitError(err instanceof Error ? err.message : '設定失敗，請稍後再試')
    } finally {
      setIsLoading(false)
    }
  }

  const steps = [
    {
      number: 1,
      title: '基本資料',
      description: '讓我們認識你',
      icon: User,
      fields: ['name', 'school', 'grade', 'className'],
    },
    {
      number: 2,
      title: '學習階段',
      description: '設定你的年級與學期',
      icon: GraduationCap,
      fields: ['grade', 'semester'],
    },
    {
      number: 3,
      title: '條款同意',
      description: '請閱讀並同意相關條款',
      icon: BookOpen,
      fields: ['agreedToTerms', 'agreedToPrivacy'],
    },
  ]

  const currentStep = steps[step - 1]

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" role="status" aria-label="載入中">
        <Spinner size="lg" />
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-math-50 via-background to-primary/5 px-4 py-12">
      <div className="w-full max-w-2xl mx-auto">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-math-500">
            <BookOpen className="h-8 w-8 text-white" aria-hidden="true" />
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {steps.map((s, i) => (
              <React.Fragment key={s.number}>
                <div className={cn(
                  'flex flex-col items-center',
                  i < steps.length - 1 && 'flex-1'
                )}>
                  <div className={cn(
                    'relative flex h-10 w-10 items-center justify-center rounded-full font-semibold transition-all',
                    i + 1 < step
                      ? 'bg-math-500 text-white'
                      : i + 1 === step
                      ? 'bg-math-500 text-white ring-4 ring-math-500/20'
                      : 'bg-muted text-muted-foreground'
                  )}>
                    {i + 1 < step ? <Check className="h-5 w-5" /> : s.number}
                  </div>
                  <span className={cn(
                    'mt-2 text-xs font-medium text-center max-w-[80px]',
                    i + 1 <= step ? 'text-foreground' : 'text-muted-foreground'
                  )}>
                    {s.title}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div className={cn(
                    'hidden md:block h-1 flex-1 mx-2 rounded-full',
                    i + 1 < step ? 'bg-math-500' : 'bg-muted'
                  )} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        <Card className="shadow-xl">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl">{currentStep.title}</CardTitle>
            <CardDescription>{currentStep.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Step 1: Basic Info */}
              {step === 1 && (
                <div className="space-y-4" data-step="1">
                  <div className="space-y-2">
                    <Label htmlFor="name">姓名 <span className="text-destructive">*</span></Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                      <Input
                        {...register('name')}
                        id="name"
                        placeholder="請輸入您的姓名"
                        className="pl-10"
                        error={errors.name?.message}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="school">學校</Label>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                      <Input
                        {...register('school')}
                        id="school"
                        placeholder="請輸入學校名稱 (選填)"
                        className="pl-10"
                        error={errors.school?.message}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="grade">年級 <span className="text-destructive">*</span></Label>
                    <Select
                      value={watchedValues.grade.toString()}
                      onValueChange={(v) => setValue('grade', parseInt(v))}
                    >
                      <SelectTrigger id="grade" className="w-full" error={!!errors.grade}>
                        <SelectValue placeholder="請選擇年級" />
                      </SelectTrigger>
                      <SelectContent>
                        {GRADES.map((g) => (
                          <SelectItem key={g.value} value={g.value.toString()}>{g.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="className">班級</Label>
                    <Input
                      {...register('className')}
                      id="className"
                      placeholder="例如：忠孝班、甲班 (選填)"
                      error={errors.className?.message}
                    />
                  </div>
                </div>
              )}

              {/* Step 2: Learning Stage */}
              {step === 2 && (
                <div className="space-y-4" data-step="2">
                  <div className="space-y-2">
                    <Label htmlFor="grade">年級 <span className="text-destructive">*</span></Label>
                    <Select
                      value={watchedValues.grade.toString()}
                      onValueChange={(v) => setValue('grade', parseInt(v))}
                    >
                      <SelectTrigger id="grade" className="w-full" error={!!errors.grade}>
                        <SelectValue placeholder="請選擇年級" />
                      </SelectTrigger>
                      <SelectContent>
                        {GRADES.map((g) => (
                          <SelectItem key={g.value} value={g.value.toString()}>{g.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="semester">學期 <span className="text-destructive">*</span></Label>
                    <Select
                      value={watchedValues.semester.toString()}
                      onValueChange={(v) => setValue('semester', parseInt(v))}
                    >
                      <SelectTrigger id="semester" className="w-full" error={!!errors.semester}>
                        <SelectValue placeholder="請選擇學期" />
                      </SelectTrigger>
                      <SelectContent>
                        {SEMESTERS.map((s) => (
                          <SelectItem key={s.value} value={s.value.toString()}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Alert variant="info" className="mb-4">
                    <AlertDescription className="flex items-start gap-2">
                      <BookOpen className="h-4 w-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
                      <div>
                        <p className="font-medium">學期說明</p>
                        <p className="text-sm mt-1">上學期：每年 8 月至次年 1 月 | 下學期：每年 2 月至 7 月</p>
                        <p className="text-sm mt-1">系統會根據目前日期自動建議學期，您也可以手動調整</p>
                      </div>
                    </AlertDescription>
                  </Alert>
                </div>
              )}

              {/* Step 3: Terms */}
              {step === 3 && (
                <div className="space-y-4" data-step="3">
                  <Alert variant="info">
                    <AlertDescription className="flex items-start gap-2">
                      <BookOpen className="h-4 w-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
                      <div className="space-y-2">
                        <p className="font-medium">服務條款與隱私權政策</p>
                        <p className="text-sm">註冊即表示您同意我們的<a href="/terms" className="underline hover:text-primary" target="_blank" rel="noopener">服務條款</a>和<a href="/privacy" className="underline hover:text-primary" target="_blank" rel="noopener">隱私權政策</a>。</p>
                        <p className="text-sm">我們承諾保護您的個人資料安全，不會將您的資料提供給第三方作為商業用途。</p>
                      </div>
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="agreedToTerms"
                        checked={Boolean(watchedValues.agreedToTerms)}
                        onCheckedChange={(checked: boolean) => setValue('agreedToTerms', checked)}
                        aria-describedby="terms-desc"
                      />
                      <div>
                        <Label htmlFor="agreedToTerms" className="font-medium cursor-pointer">
                          我已閱讀並同意<a href="/terms" target="_blank" rel="noopener" className="underline hover:text-primary">服務條款</a>
                        </Label>
                        <p id="terms-desc" className="text-sm text-muted-foreground">包括帳號使用規範、內容授權、免責聲明等</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="agreedToPrivacy"
                        checked={Boolean(watchedValues.agreedToPrivacy)}
                        onCheckedChange={(checked: boolean) => setValue('agreedToPrivacy', checked)}
                        aria-describedby="privacy-desc"
                      />
                      <div>
                        <Label htmlFor="agreedToPrivacy" className="font-medium cursor-pointer">
                          我已閱讀並同意<a href="/privacy" target="_blank" rel="noopener" className="underline hover:text-primary">隱私權政策</a>
                        </Label>
                        <p id="privacy-desc" className="text-sm text-muted-foreground">包括個人資料蒐集、使用、保護與您的權利</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {submitError && (
                <Alert variant="destructive">
                  <AlertDescription>{submitError}</AlertDescription>
                </Alert>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                  disabled={step === 1}
                  className="gap-2"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                  上一步
                </Button>

                {step < totalSteps ? (
                  <Button type="button" onClick={nextStep} className="gap-2">
                    下一步
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </Button>
                ) : (
                  <Button type="submit" disabled={isLoading} className="gap-2 w-full sm:w-auto">
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        完成設定
                      </>
                    ) : (
                      '完成並開始學習'
                    )}
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          需要協助？<a href="/help" className="text-math-500 hover:underline ml-1">查看說明文件</a>
        </p>
      </div>
    </div>
  )
}

// Check icon component
function Check({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
      <path d="M3 8l3 3 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function OnboardingPage() {
  return (
    <SuspenseWrapper fallback={<div className="min-h-screen flex items-center justify-center"><Spinner size="lg" /></div>}>
      <OnboardingPageContent />
    </SuspenseWrapper>
  )
}