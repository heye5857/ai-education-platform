'use client'

import * as React from 'react'
import { Spinner } from '@/components/ui/spinner'

interface SuspenseWrapperProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function SuspenseWrapper({ children, fallback = <div className="min-h-screen flex items-center justify-center"><Spinner size="lg" /></div> }: SuspenseWrapperProps) {
  return <React.Suspense fallback={fallback}>{children}</React.Suspense>
}