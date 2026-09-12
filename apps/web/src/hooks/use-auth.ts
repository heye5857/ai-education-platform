'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect } from 'react'

export function useAuth() {
  const { data: session, status, update } = useSession()
  const router = useRouter()
  const pathname = usePathname()

  const user = session?.user

  const handleSignOut = async (options?: { callbackUrl?: string }) => {
    await signOut({ callbackUrl: options?.callbackUrl ?? '/' })
  }

  // Redirect to login if accessing protected routes without session
  useEffect(() => {
    const protectedRoutes = ['/dashboard']
    const isProtected = protectedRoutes.some((route) => pathname.startsWith(route))
    const isAuthRoute = pathname === '/login' || pathname.startsWith('/auth')

    if (status === 'unauthenticated' && isProtected) {
      router.push('/login')
    }

    if (status === 'authenticated' && isAuthRoute) {
      router.push('/dashboard')
    }
  }, [status, pathname, router])

  return {
    user,
    session,
    status,
    isLoading: status === 'loading',
    isAuthenticated: status === 'authenticated',
    signOut: handleSignOut,
    update,
  }
}

export function useRequireAuth() {
  const { user, status, isLoading, isAuthenticated } = useAuth()

  if (isLoading) {
    return { user: null, isLoading: true, isAuthenticated: false }
  }

  if (!user) {
    return { user: null, isLoading: false, isAuthenticated: false }
  }

  return { user, isLoading: false, isAuthenticated }
}