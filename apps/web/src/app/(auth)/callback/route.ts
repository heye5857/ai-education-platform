import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const callbackUrl = request.nextUrl.searchParams.get('callbackUrl') || '/dashboard'

  // Check if onboarding is needed by fetching user from database
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { onboardingCompleted: true },
  })

  const needsOnboarding = user ? !user.onboardingCompleted : true

  if (needsOnboarding) {
    return NextResponse.redirect(new URL(`/onboarding?callbackUrl=${encodeURIComponent(callbackUrl)}`, request.url))
  }

  return NextResponse.redirect(new URL(callbackUrl, request.url))
}