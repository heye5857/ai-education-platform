'use client'

import * as React from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { BookOpen, Github, Twitter, Mail } from 'lucide-react'

export function Footer() {
  const currentYear = new Date().getFullYear()

  const footerLinks = {
    產品: [
      { name: '學習地圖', href: '/dashboard/map' },
      { name: 'AI 問答', href: '/dashboard/chat' },
      { name: '錯題本', href: '/dashboard/wrong-questions' },
      { name: '學習分析', href: '/dashboard/analysis' },
    ],
    公司: [
      { name: '關於我們', href: '/about' },
      { name: '部落格', href: '/blog' },
      { name: '職缺', href: '/careers' },
      { name: '新聞', href: '/press' },
    ],
    支援: [
      { name: '說明中心', href: '/help' },
      { name: '聯絡我們', href: '/contact' },
      { name: '隱私權政策', href: '/privacy' },
      { name: '服務條款', href: '/terms' },
    ],
    法律: [
      { name: '隱私權政策', href: '/privacy' },
      { name: '服務條款', href: '/terms' },
      { name: 'Cookie 政策', href: '/cookies' },
    ],
  }

  const socialLinks = [
    { name: 'GitHub', href: 'https://github.com', icon: Github },
    { name: 'Twitter', href: 'https://twitter.com', icon: Twitter },
    { name: 'Email', href: 'mailto:hello@example.com', icon: Mail },
  ]

  return (
    <footer className="border-t bg-muted/30" role="contentinfo">
      <div className="container px-4 py-12 md:py-16 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-5">
          <div className="col-span-2 lg:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4" aria-label="AI Education Platform Home">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-math-500">
                <BookOpen className="h-5 w-5 text-white" aria-hidden="true" />
              </div>
              <span className="font-bold text-xl">AI 數學平台</span>
            </Link>
            <p className="text-sm text-muted-foreground mb-4 max-w-xs">
              以 AI 為核心的個人化數學教學平台，讓每個學生都能獲得專屬的學習體驗。
            </p>
            <div className="flex gap-4">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={social.name}
                >
                  <social.icon className="h-5 w-5" aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>

          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="font-semibold mb-4">{category}</h3>
              <ul className="space-y-3" role="list">
                {links.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 border-t pt-8">
          <p className="text-sm text-muted-foreground text-center">
            © {currentYear} AI 數學平台. 保留所有權利。
          </p>
        </div>
      </div>
    </footer>
  )
}