'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ChevronLeft, LayoutDashboard, BookOpen, MessageSquare, BarChart, Settings, FolderOpen, Trophy, HelpCircle } from 'lucide-react'
import { useMobileNav } from '@/hooks/use-mobile-nav'

const navigation = [
  { name: '首頁', href: '/dashboard', icon: LayoutDashboard },
  { name: '學習地圖', href: '/dashboard/map', icon: BookOpen },
  { name: 'AI 問答', href: '/dashboard/chat', icon: MessageSquare },
  { name: '錯題本', href: '/dashboard/wrong-questions', icon: FolderOpen },
  { name: '學習分析', href: '/dashboard/analysis', icon: BarChart },
  { name: '成就', href: '/dashboard/achievements', icon: Trophy },
  { name: '設定', href: '/dashboard/settings', icon: Settings },
  { name: '說明', href: '/dashboard/help', icon: HelpCircle },
]

export function Sidebar() {
  const pathname = usePathname()
  const { isOpen, close } = useMobileNav()
  const [collapsed, setCollapsed] = React.useState(false)

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={close}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'fixed left-0 top-16 z-50 h-[calc(100vh-4rem)] w-64 border-r bg-background transition-all duration-300 md:translate-x-0',
          collapsed && 'w-16',
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
        aria-label="Sidebar navigation"
      >
        <div className="flex h-full flex-col">
          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-1" aria-label="Main navigation">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                    isActive
                      ? 'bg-math-500/10 text-math-600'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent',
                    collapsed && 'justify-center px-2'
                  )}
                  aria-current={isActive ? 'page' : undefined}
                  aria-label={collapsed ? item.name : undefined}
                  onClick={close}
                >
                  <Icon className={cn('h-5 w-5 flex-shrink-0', collapsed && 'mx-auto')} aria-hidden="true" />
                  {!collapsed && <span>{item.name}</span>}
                </Link>
              )
            })}
          </nav>

          {/* Collapse toggle */}
          <div className="p-4 border-t">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(!collapsed)}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-expanded={!collapsed}
              className={cn('w-full justify-center', collapsed && 'rotate-180')}
            >
              <ChevronLeft className="h-5 w-5 transition-transform duration-200" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </aside>
    </>
  )
}