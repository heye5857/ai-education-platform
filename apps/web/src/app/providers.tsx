import { SessionProvider } from 'next-auth/react'
import { QueryProvider } from '@/lib/api/client'
import { ThemeProvider } from '@/hooks/use-theme'
import { Toaster } from '@/components/ui/toaster'
import { MobileNavProvider } from '@/hooks/use-mobile-nav'
import { ReactNode } from 'react'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <QueryProvider>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <MobileNavProvider>
            {children}
            <Toaster />
          </MobileNavProvider>
        </ThemeProvider>
      </QueryProvider>
    </SessionProvider>
  )
}