'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { AlertCircle, RefreshCw, Home } from 'lucide-react'
import Link from 'next/link'

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error)
    console.error('Component stack:', errorInfo.componentStack)

    // Could send to error tracking service here
    // e.g., Sentry.captureException(error)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-4">
          <div className="w-full max-w-md text-center space-y-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 mx-auto">
              <AlertCircle className="h-8 w-8 text-destructive" aria-hidden="true" />
            </div>
            <h2 className="text-xl font-semibold">發生錯誤</h2>
            <p className="text-muted-foreground">
              頁面載入時發生問題，請嘗試重新整理或回到首頁
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={this.handleRetry} variant="default" className="gap-2">
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                重新整理
              </Button>
              <Button variant="outline" onClick={() => window.location.assign('/dashboard')}>
                <Home className="h-4 w-4 mr-2" aria-hidden="true" />
                回到首頁
              </Button>
            </div>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="text-left mt-4 p-4 bg-muted rounded-lg text-sm">
                <summary className="cursor-pointer font-medium mb-2">錯誤詳情 (開發模式)</summary>
                <pre className="whitespace-pre-wrap text-destructive">{this.state.error.message}</pre>
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export function ErrorFallback({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-[400px] flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center space-y-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 mx-auto">
          <AlertCircle className="h-8 w-8 text-destructive" aria-hidden="true" />
        </div>
        <h2 className="text-xl font-semibold">發生錯誤</h2>
        <p className="text-muted-foreground">{error.message}</p>
        <Button onClick={reset} variant="default" className="gap-2">
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          重試
        </Button>
      </div>
    </div>
  )
}