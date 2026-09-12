'use client'

import * as React from 'react'
import { createContext, useContext, ReactNode } from 'react'
import { ThemeProvider as NextThemesProvider } from 'next-themes'

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  resolvedTheme: 'light' | 'dark'
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children, ...props }: { children: ReactNode; attribute?: 'class' | 'data-theme'; defaultTheme?: Theme; enableSystem?: boolean; disableTransitionOnChange?: boolean }) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}