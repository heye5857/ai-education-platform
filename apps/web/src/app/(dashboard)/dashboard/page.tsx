'use client'

export const dynamic = 'force-dynamic'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ProgressRing } from '@/components/learning/ProgressRing'
import { Badge } from '@/components/ui/badge'
import { BookOpen, MessageSquare, BarChart, FolderOpen, Trophy, ArrowRight, Target, Zap, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'math' | 'primary'

interface Feature {
  name: string
  description: string
  icon: React.ElementType
  href: string
  color: BadgeVariant
  stats: Record<string, number>
  featured?: boolean
}

interface QuickAction {
  name: string
  description: string
  icon: React.ElementType
  href: string
  variant: BadgeVariant
}

const features: Feature[] = [
  {
    name: '學習地圖',
    description: '依課綱設計的完整學習路徑，一關一關解鎖新知識',
    icon: BookOpen,
    href: '/dashboard/map',
    color: 'math',
    stats: { completed: 12, total: 20 },
    featured: true,
  },
  {
    name: 'AI 問答',
    description: '蘇格拉底式引導教學，不給答案只給思考方向',
    icon: MessageSquare,
    href: '/dashboard/chat',
    color: 'primary',
    stats: { conversations: 45, todayQuestions: 3 },
  },
  {
    name: '錯題本',
    description: '自動收集錯題，智慧複習提醒，攻克弱點',
    icon: FolderOpen,
    href: '/dashboard/wrong-questions',
    color: 'destructive',
    stats: { pending: 8, mastered: 23 },
  },
  {
    name: '學習分析',
    description: '即時掌握度追蹤，薄弱環節分析，個人化建議',
    icon: BarChart,
    href: '/dashboard/analysis',
    color: 'success',
    stats: { masteryAvg: 72, weakPoints: 3 },
  },
  {
    name: '成就系統',
    description: '學習里程碑獎勵，激發持續學習動力',
    icon: Trophy,
    href: '/dashboard/achievements',
    color: 'warning',
    stats: { unlocked: 15, total: 28 },
  },
]

const quickActions: QuickAction[] = [
  { name: '繼續學習', description: '從上次中斷的地方繼續', icon: Zap, href: '/dashboard/map?continue=true', variant: 'math' },
  { name: '複習錯題', description: 'AI 推薦的複習題目', icon: Target, href: '/dashboard/wrong-questions?mode=review', variant: 'destructive' },
  { name: '問 AI 老師', description: '立即獲得引導式解答', icon: Sparkles, href: '/dashboard/chat', variant: 'primary' },
]

export default function DashboardHomePage() {
  const { data: session } = useSession()
  const router = useRouter()
  const studentName = session?.user?.name || '同學'

  return (
    <div className="space-y-8">
      <section className="space-y-4" aria-labelledby="welcome-heading">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 id="welcome-heading" className="text-3xl font-bold tracking-tight">
              歡迎回來，{studentName} 👋
            </h1>
            <p className="text-muted-foreground mt-1">
              今天也要繼續努力學習喔！現在是 {new Date().toLocaleDateString('zh-TW', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <Button variant="math" size="lg" className="gap-2" onClick={() => router.push('/dashboard/map?continue=true')}>
            繼續學習
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </section>

      <section aria-labelledby="progress-heading" className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">整體掌握度</CardTitle>
            <Badge variant="math">數學</Badge>
          </CardHeader>
          <CardContent className="flex items-center justify-center py-4">
            <ProgressRing progress={72} size={100} variant="math" showPercentage />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">本週學習時數</CardTitle>
            <Badge variant="success">+2.5h</Badge>
          </CardHeader>
          <CardContent className="flex items-center justify-center py-4">
            <div className="text-center">
              <div className="text-3xl font-bold">4.5</div>
              <div className="text-sm text-muted-foreground">小時</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">連續學習天數</CardTitle>
            <Badge variant="warning">🔥 7 天</Badge>
          </CardHeader>
          <CardContent className="flex items-center justify-center py-4">
            <div className="text-center">
              <div className="text-3xl font-bold">7</div>
              <div className="text-sm text-muted-foreground">天</div>
            </div>
          </CardContent>
        </Card>
      </section>

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
                        {key === 'total' && '總計'}
                        {key === 'conversations' && '對話數'}
                        {key === 'todayQuestions' && '今日提問'}
                        {key === 'pending' && '待複習'}
                        {key === 'mastered' && '已掌握'}
                        {key === 'masteryAvg' && '平均掌握度'}
                        {key === 'weakPoints' && '薄弱點'}
                        {key === 'unlocked' && '已解鎖'}
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
    </div>
  )
}