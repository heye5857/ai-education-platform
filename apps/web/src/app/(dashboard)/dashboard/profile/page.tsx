'use client'

export const dynamic = 'force-dynamic'

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/modal'
import { Spinner } from '@/components/ui/spinner'
import { Loader2, User, Building, GraduationCap, BookOpen, Save, Info } from 'lucide-react'
import { api, queryKeys } from '@/lib/api/client'
import { useToast } from '@/hooks/use-toast'
import { studentProfileSchema, type StudentProfileInput } from '@/lib/validations/schemas'
import { GRADES, SEMESTERS, getCurrentSemester, getGradeLabel } from '@/lib/semester'

interface StudentProfile {
  id: string
  name: string | null
  school: string | null
  grade: number
  className: string | null
  semester: number
}

function ProfileForm({ initial }: { initial: StudentProfile }) {
  const queryClient = useQueryClient()
  const { update } = useSession()
  const { toast } = useToast()
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [pendingData, setPendingData] = React.useState<StudentProfileInput | null>(null)

  const detectedSemester = React.useMemo(() => getCurrentSemester(), [])

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<StudentProfileInput>({
    resolver: zodResolver(studentProfileSchema),
    defaultValues: {
      name: initial.name ?? '',
      school: initial.school ?? '',
      grade: initial.grade,
      className: initial.className ?? '',
      semester: initial.semester,
    },
  })

  const watched = watch()
  const gradeChanged = watched.grade !== initial.grade
  const semesterChanged = watched.semester !== initial.semester
  const scopeChanged = gradeChanged || semesterChanged

  const mutation = useMutation({
    mutationFn: (data: StudentProfileInput) =>
      api.patch<{ student: StudentProfile }>('/api/student/profile', data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.student.all })
      await update()
      toast({
        title: '儲存成功',
        description: '個人資料已更新',
      })
      setConfirmOpen(false)
      setPendingData(null)
    },
    onError: () => {
      toast({
        title: '儲存失敗',
        description: '請檢查輸入內容後再試一次',
        variant: 'destructive',
      })
      setConfirmOpen(false)
      setPendingData(null)
    },
  })

  const onSubmit = (data: StudentProfileInput) => {
    // 年級/學期變更會影響學習地圖範圍，需再次確認
    if (
      (data.grade !== initial.grade || data.semester !== initial.semester) &&
      !pendingData
    ) {
      setPendingData(data)
      setConfirmOpen(true)
      return
    }
    mutation.mutate(data)
  }

  const handleConfirm = () => {
    if (pendingData) mutation.mutate(pendingData)
  }

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="name">
            姓名 <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <User
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              {...register('name')}
              id="name"
              placeholder="請輸入您的姓名"
              className="pl-10"
              error={errors.name?.message}
              disabled={mutation.isPending}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="school">學校</Label>
          <div className="relative">
            <Building
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              {...register('school')}
              id="school"
              placeholder="請輸入學校名稱（選填）"
              className="pl-10"
              error={errors.school?.message}
              disabled={mutation.isPending}
            />
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="grade">
              年級 <span className="text-destructive">*</span>
            </Label>
            <Select
              value={String(watched.grade)}
              onValueChange={(v) => setValue('grade', parseInt(v), { shouldDirty: true })}
            >
              <SelectTrigger id="grade" className="w-full" error={!!errors.grade}>
                <SelectValue placeholder="請選擇年級" />
              </SelectTrigger>
              <SelectContent>
                {GRADES.map((g) => (
                  <SelectItem key={g.value} value={String(g.value)}>
                    {g.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.grade && (
              <p className="text-sm text-destructive" role="alert">
                {errors.grade.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="className">班級</Label>
            <Input
              {...register('className')}
              id="className"
              placeholder="例如：忠孝班、甲班（選填）"
              error={errors.className?.message}
              disabled={mutation.isPending}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="semester">
            學期 <span className="text-destructive">*</span>
          </Label>
          <Select
            value={String(watched.semester)}
            onValueChange={(v) => setValue('semester', parseInt(v), { shouldDirty: true })}
          >
            <SelectTrigger id="semester" className="w-full" error={!!errors.semester}>
              <SelectValue placeholder="請選擇學期" />
            </SelectTrigger>
            <SelectContent>
              {SEMESTERS.map((s) => (
                <SelectItem key={s.value} value={String(s.value)}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
            <Info className="h-3.5 w-3.5" aria-hidden="true" />
            系統偵測目前為{detectedSemester === 1 ? '上學期' : '下學期'}，若不符請手動調整
            {watched.semester !== detectedSemester && '（您選擇了不同學期）'}
          </p>
          {errors.semester && (
            <p className="text-sm text-destructive" role="alert">
              {errors.semester.message}
            </p>
          )}
        </div>

        {scopeChanged && (
          <Alert variant="info">
            <AlertDescription className="flex items-start gap-2">
              <GraduationCap className="h-4 w-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
              <div>
                <p className="font-medium">注意：您變更了學習範圍</p>
                <p className="text-sm mt-1">
                  {getGradeLabel(initial.grade)} → {getGradeLabel(watched.grade)}
                  {semesterChanged &&
                    `（${initial.semester === 1 ? '上' : '下'}學期 → ${
                      watched.semester === 1 ? '上' : '下'
                    }學期）`}
                  ，學習地圖範圍將隨之調整。送出前會再請您確認。
                </p>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <Button type="submit" className="w-full sm:w-auto gap-2" disabled={mutation.isPending || !isDirty}>
          {mutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              儲存中…
            </>
          ) : (
            <>
              <Save className="h-4 w-4" aria-hidden="true" />
              儲存變更
            </>
          )}
        </Button>
      </form>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>確認變更學習範圍？</DialogTitle>
            <DialogDescription>
              年級或學期變更後，學習地圖的課程範圍將隨之調整，進度顯示可能有所不同。確定要儲存嗎？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              再想想
            </Button>
            <Button onClick={handleConfirm} disabled={mutation.isPending}>
              {mutation.isPending ? '儲存中…' : '確定儲存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default function ProfilePage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['student', 'profile', 'me'],
    queryFn: () => api.get<{ student: StudentProfile }>('/api/student/profile'),
    retry: false,
  })

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">個人資料</h1>
        <p className="text-muted-foreground mt-1">管理您的姓名、學校、年級與學期</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-math-500/10">
            <BookOpen className="h-6 w-6 text-math-500" aria-hidden="true" />
          </div>
          <CardTitle className="mt-3">基本資料</CardTitle>
          <CardDescription>年級與學期決定學習地圖的課程範圍</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Spinner size="lg" />
            </div>
          )}

          {isError && (
            <Alert variant="destructive">
              <AlertDescription className="flex flex-col gap-3">
                <span>載入個人資料失敗，可能是尚未完成新手引導。</span>
                <span className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => refetch()}>
                    重試
                  </Button>
                  <Button variant="default" size="sm" onClick={() => (window.location.href = '/onboarding')}>
                    前往新手引導
                  </Button>
                </span>
              </AlertDescription>
            </Alert>
          )}

          {data?.student && <ProfileForm key={data.student.id} initial={data.student} />}

          <p className="mt-6 text-center text-sm text-muted-foreground">
            <Link href="/dashboard" className="text-math-500 hover:underline">
              ← 回到首頁
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
