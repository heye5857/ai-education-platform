import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
})

export const metadata: Metadata = {
  title: {
    default: 'AI 數學平台 - 個人化數學教學平台',
    template: '%s | AI 數學平台',
  },
  description: '以 AI 為核心的個人化數學教學平台，讓每個學生都能獲得專屬的學習體驗。',
  keywords: ['AI 教育', '數學教學', '個人化學習', '線上學習', '智能教學'],
  authors: [{ name: 'AI Education Platform Team' }],
  creator: 'AI Education Platform',
  publisher: 'AI Education Platform',
  robots: 'index, follow',
  openGraph: {
    type: 'website',
    locale: 'zh_TW',
    url: 'https://ai-math-platform.com',
    siteName: 'AI 數學平台',
    title: 'AI 數學平台 - 個人化數學教學平台',
    description: '以 AI 為核心的個人化數學教學平台，讓每個學生都能獲得專屬的學習體驗。',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'AI 數學平台',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI 數學平台',
    description: '以 AI 為核心的個人化數學教學平台',
    images: ['/og-image.png'],
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-TW" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}