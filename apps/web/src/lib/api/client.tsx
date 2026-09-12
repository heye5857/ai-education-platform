'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode, useState } from 'react'

// API Error class
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message)
    this.name = 'ApiError'
  }

  static fromResponse(response: Response, data: unknown): ApiError {
    const errorData = data as { code?: string; message?: string; details?: unknown } | null
    return new ApiError(
      response.status,
      errorData?.code ?? 'UNKNOWN_ERROR',
      errorData?.message ?? response.statusText,
      errorData?.details
    )
  }
}

// API client configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? ''

async function fetchWithAuth(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(options.headers)
  headers.set('Content-Type', 'application/json')

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include', // Include cookies for session
  })

  return response
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetchWithAuth(endpoint, options)

  if (!response.ok) {
    const data = await response.json().catch(() => null)
    throw ApiError.fromResponse(response, data)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json()
}

// Query keys factory
export const queryKeys = {
  student: {
    all: ['student'] as const,
    profile: (studentId: string) => ['student', 'profile', studentId] as const,
    dashboard: (studentId: string) => ['student', 'dashboard', studentId] as const,
    mastery: (studentId: string) => ['student', 'mastery', studentId] as const,
    wrongQuestions: (studentId: string) => ['student', 'wrong-questions', studentId] as const,
    progress: (studentId: string) => ['student', 'progress', studentId] as const,
  },
  learning: {
    map: (studentId: string) => ['learning', 'map', studentId] as const,
    level: (levelId: string) => ['learning', 'level', levelId] as const,
    video: (videoId: string) => ['learning', 'video', videoId] as const,
  },
  ai: {
    conversations: (studentId: string) => ['ai', 'conversations', studentId] as const,
    messages: (conversationId: string) => ['ai', 'messages', conversationId] as const,
  },
  assessment: {
    initial: (studentId: string) => ['assessment', 'initial', studentId] as const,
    levelTest: (levelId: string) => ['assessment', 'level-test', levelId] as const,
  },
}

// Create QueryClient
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
        retry: (failureCount, error) => {
          if (error instanceof ApiError) {
            // Don't retry on 4xx errors
            if (error.status >= 400 && error.status < 500) return false
            // Retry on 5xx errors
            if (error.status >= 500) return failureCount < 3
          }
          return failureCount < 3
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: false,
      },
    },
  })
}

// QueryClientProvider wrapper
export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient)

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

// API helper functions
export const api = {
  get: <T,>(endpoint: string) => apiRequest<T>(endpoint, { method: 'GET' }),
  post: <T,>(endpoint: string, data: unknown) =>
    apiRequest<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  put: <T,>(endpoint: string, data: unknown) =>
    apiRequest<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  patch: <T,>(endpoint: string, data: unknown) =>
    apiRequest<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  delete: <T,>(endpoint: string) =>
    apiRequest<T>(endpoint, { method: 'DELETE' }),
}