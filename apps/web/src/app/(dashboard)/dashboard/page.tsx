'use client'

export const dynamic = 'force-dynamic'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ProgressRing } from '@/components/learning/ProgressRing'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { BookOpen, MessageSquare, BarChart, FolderOpen, Trophy, ArrowRight, Target, Zap, Sparkles, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { api, queryKeys } from '@/lib/api/client'
import { getGradeLabel } from '@/lib/semester'

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'math' | 'primary'

interface DashboardProfile {
  id: string
  name: string | null
  grade: number
  semester: number
}

interface DashboardStats {
  wrongQuestionsPending: number
  wrongQuestionsMastered: number
  conversationsActive: number
  levelsCompleted: number
  levelsInProgress: number
  masteryAvg: number
  knowledgePointsTracked: number
}

interface DashboardData {
  profile: DashboardProfile
  stats: DashboardStats
}

interface Feature {
  name: string
  description: string
  icon: React.ElementType
  href: string
  color: BadgeVariant
  stats: Record<string, number>
  featured?: boolean
}

export default function DashboardHomePage() {
  const { data: session } = useSession()
  const router = useRouter()

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.student.dashboard('me'),
    queryFn: () => api.get<DashboardData>('/api/student/dashboard'),
    retry: false,
  })

  const profile = data?.profile
  const stats = data?.stats
  const studentName = profile?.name || session?.user?.name || '同學'
  const isNewUser =
    !!stats &&
    stats.levelsCompleted === 0 &&
    stats.levelsInProgress === 0 &&
    stats.wrongQuestionsPending === 0 &&
    stats.wrongQuestionsMastered === 0 &&
    stats.conversationsActive === 0 &&
    stats.knowledgePointsTracked === 0

  const features: Feature[] = [
    {
      name: '學習地圖',
      description: '依課綱設計的完整學習路徑，一關一關解鎖新知識',
      icon: BookOpen,
      href: '/dashboard/map',
      color: 'math',
      stats: { completed: stats?.levelsCompleted ?? 0, inProgress: stats?.levelsInProgress ?? 0 },
      featured: true,
    },
    {
      name: 'AI 問答',
      description: '蘇格拉底式引導教學，不給答案只給思考方向',
      icon: MessageSquare,
      href: '/dashboard/chat',
      color: 'primary',
      stats: { conversations: stats?.conversationsActive ?? 0 },
    },
    {
      name: '錯題本',
      description: '自動收集錯題，智慧複習提醒，攻克弱點',
      icon: FolderOpen,
      href: '/dashboard/wrong-questions',
      color: 'destructive',
      stats: {
        pending: stats?.wrongQuestionsPending ?? 0,
        mastered: stats?.wrongQuestionsMastered ?? 0,
      },
    },
    {
      name: '學習分析',
      description: '即時掌握度追蹤，薄弱環節分析，個人化建議',
      icon: BarChart,
      href: '/dashboard/analysis',
      color: 'success',
      stats: { masteryAvg: stats?.masteryAvg ?? 0 },
    },
    {
      name: '成就系統',
      description: '學習里程碑獎勵，激發持續學習動力',
      icon: Trophy,
      href: '/dashboard/achievements',
      color: 'warning',
      stats: {},
    },
  ]

  const quickActions = [
    { name: '繼續學習', description: '從上次中斷的地方繼續', icon: Zap, href: '/dashboard/map?continue=true', variant: 'math' as BadgeVariant },
    { name: '複習錯題', description: 'AI 推薦的複習題目', icon: Target, href: '/dashboard/wrong-questions?mode=review', variant: 'destructive' as BadgeVariant },
    { name: '問 AI 老師', description: '立即獲得引導式解答', icon: Sparkles, href: '/dashboard/chat', variant: 'primary' as BadgeVariant },
  ]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24" role="status" aria-label="載入中">
        <Spinner size="lg" />
      </div>
    )
  }

  if (isError || !profile || !stats) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">歡迎回來，{studentName} 👋</h1>
        <Alert variant="destructive">
          <AlertDescription className="flex flex-col gap-3">
            <span>載入學習摘要失敗，可能是尚未完成新手引導。</span>
            <span className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                重試
              </Button>
              <Button variant="default" size="sm" onClick={() => router.push('/onboarding')}>
                前往新手引導
              </Button>
            </span>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <section className="space-y-4" aria-labelledby="welcome-heading">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 id="welcome-heading" className="text-3xl font-bold tracking-tight">
              歡迎回來，{studentName} 👋
            </h1>
            <p className="text-muted-foreground mt-1">
              {getGradeLabel(profile.grade)}・{profile.semester === 1 ? '上學期' : '下學期'}｜
              今天也要繼續努力學習喔！現在是 {new Date().toLocaleDateString('zh-TW', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <Button variant="math" size="lg" className="gap-2" onClick={() => router.push('/dashboard/map?continue=true')}>
            繼續學習
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </section>

      {/* 新生能力測驗邀請（尚無任何作答紀錄時顯示） */}
      {isNewUser && (
        <section aria-labelledby="assessment-heading">
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="py-5 flex items-center justify-between flex-wrap gap-4">
              <div>
                <p id="assessment-heading" className="font-semibold">
                  先花 10 分鐘做能力測驗，了解你的起點
                </p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  依你的年級跨單元組卷，結果用於個人化學習建議
                </p>
              </div>
              <Button variant="default" onClick={() => router.push('/dashboard/assessment/initial')}>
                開始能力測驗
              </Button>
            </CardContent>
          </Card>
        </section>
      )}

      {/* 新用戶空狀態引導 */}
      {isNewUser && (
        <section aria-labelledby="onboarding-heading">
          <Card className="border-math-500/30 bg-math-500/5">
            <CardHeader>
              <CardTitle id="onboarding-heading" className="flex items-center gap-2">
                <Info className="h-5 w-5 text-math-500" aria-hidden="true" />
                開始你的學習之旅（3 步驟）
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3 text-sm">
                <li className="flex items-start gap-3">
                  <Badge variant="math">1</Badge>
                  <span>確認 <button className="underline hover:text-math-600" onClick={() => router.push('/dashboard/profile')}>個人資料</button>（年級決定學習地圖範圍）</span>
                </li>
                <li className="flex items-start gap-3">
                  <Badge variant="math">2</Badge>
                  <span>打開 <button className="underline hover:text-math-600" onClick={() => router.push('/dashboard/map')}>學習地圖</button>，從第一關開始</span>
                </li>
                <li className="flex items-start gap-3">
                  <Badge variant="math">3</Badge>
                  <span>卡關時 <button className="underline hover:text-math-600" onClick={() => router.push('/dashboard/chat')}>問 AI 老師</button>，它會引導你思考</span>
                </li>
              </ol>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Progress Overview（真實數據） */}
      <section aria-labelledby="progress-heading" className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">整體掌握度</CardTitle>
            <Badge variant="math">數學</Badge>
          </CardHeader>
          <CardContent className="flex items-center justify-center py-4">
            <ProgressRing progress={stats.masteryAvg} size={100} variant="math" showPercentage />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">已完成關卡</CardTitle>
            <Badge variant="success">{stats.levelsInProgress > 0 ? '進行中' : '待開始'}</Badge>
          </CardHeader>
          <CardContent className="flex items-center justify-center py-4">
            <div className="text-center">
              <div className="text-3xl font-bold">{stats.levelsCompleted}</div>
              <div className="text-sm text-muted-foreground">關（進行中 {stats.levelsInProgress}）</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">待複習錯題</CardTitle>
            <Badge variant="warning">{stats.wrongQuestionsPending} 題</Badge>
          </CardHeader>
          <CardContent className="flex items-center justify-center py-4">
            <div className="text-center">
              <div className="text-3xl font-bold">{stats.wrongQuestionsPending}</div>
              <div className="text-sm text-muted-foreground">題（已掌握 {stats.wrongQuestionsMastered}）</div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Quick Actions */}
      <section aria-labelledby="quick-actions-heading">
        <h2 id="quick-actions-heading" className="text-xl font-semibold mb-4">快速行動</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {quickActions.map((action) => {
            const Icon = action.icon
            return (
              <Button
                key={action.name}
                variant="outline"
                className={cn('h-28 flex-col items-start justify-between p-6', 'hover:shadow-lg')}
                onClick={() => router.push(action.href)}
              >
                <div className="flex items-center justify-between w-full mb-4">
                  <Icon className={cn('h-6 w-6', `text-${action.variant}-500`)} aria-hidden="true" />
                  <Badge variant={action.variant}>{action.name}</Badge>
                </div>
                <p className="text-sm text-muted-foreground w-full">{action.description}</p>
              </Button>
            )
          })}
        </div>
      </section>

      {/* Main Features */}
      <section aria-labelledby="features-heading">
        <div className="flex items-center justify-between mb-4">
          <h2 id="features-heading" className="text-xl font-semibold">核心功能</h2>
          <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/features')}>
            查看全部 <ArrowRight className="h-4 w-4 ml-1" aria-hidden="true" />
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <Card
                key={feature.name}
                className={cn(
                  'group hover:shadow-xl transition-shadow',
                  feature.featured && 'ring-2 ring-math-500/30'
                )}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', `bg-${feature.color}-500/10`)}>
                      <Icon className={cn('h-5 w-5', `text-${feature.color}-500`)} aria-hidden="true" />
                    </div>
                    {feature.featured && <Badge variant={feature.color}>推薦</Badge>}
                  </div>
                  <CardTitle className="mt-3">{feature.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {Object.entries(feature.stats).map(([key, value]) => (
                      <Badge key={key} variant="outline" className="gap-1">
                        {key === 'completed' && '已完成'}
                        {key === 'inProgress' && '進行中'}
                        {key === 'conversations' && '對話數'}
                        {key === 'pending' && '待複習'}
                        {key === 'mastered' && '已掌握'}
                        {key === 'masteryAvg' && '平均掌握度'}
                        : {value}
                      </Badge>
                    ))}
                  </div>
                  <Button variant="outline" className="w-full justify-between group" onClick={() => router.push(feature.href)}>
                    進入功能
                    <ArrowRight className={cn('h-4 w-4 transition-transform group-hover:translate-x-1', `text-${feature.color}-500`)} aria-hidden="true" />
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>

      {/* Learning Tips */}
      <section aria-labelledby="tips-heading" className="border-t pt-8">
        <h2 id="tips-heading" className="text-xl font-semibold mb-4">學習小提醒</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              title: '每天一點點',
              description: '每天花 15 分鐘複習，比週末突擊 3 小時更有效',
              icon: Target,
            },
            {
              title: '錯題是寶藏',
              description: '錯題反映薄弱環節，定期複習錯題是提升最快的方法',
              icon: FolderOpen,
            },
            {
              title: '善用 AI 老師',
              description: '遇到不懂的概念，先問 AI 老師引導思考，再嘗試自己解釋',
              icon: Sparkles,
            },
          ].map((tip) => {
            const Icon = tip.icon
            return (
              <Card key={tip.title} className="bg-muted/30">
                <CardContent className="pt-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-math-500/10 mb-3">
                    <Icon className="h-5 w-5 text-math-500" aria-hidden="true" />
                  </div>
                  <h3 className="font-medium mb-1">{tip.title}</h3>
                  <p className="text-sm text-muted-foreground">{tip.description}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>
    </div>
  )
}