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
  // Redirect to onboarding if authenticated but onboarding not completed
  useEffect(() => {
    const protectedRoutes = ['/dashboard']
    const isProtected = protectedRoutes.some((route) => pathname.startsWith(route))
    const isAuthRoute = pathname === '/login' || pathname.startsWith('/auth')
    const onOnboarding =
      pathname === '/onboarding' || pathname.startsWith('/onboarding/')

    if (status === 'unauthenticated' && isProtected) {
      router.push('/login')
      return
    }

    if (status === 'authenticated') {
      const onboarded = user?.onboardingCompleted ?? false
      if (!onboarded && !onOnboarding) {
        router.push('/onboarding')
        return
      }
      if (onboarded && isAuthRoute) {
        router.push('/dashboard')
      }
    }
  }, [status, pathname, router, user?.onboardingCompleted])

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