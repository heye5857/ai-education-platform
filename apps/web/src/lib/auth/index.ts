import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from '@/lib/db'

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      authorization: {
        params: {
          scope: 'openid email profile',
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id
        token.role = (user as { role?: string }).role ?? 'STUDENT'
      }
      if (account) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
      }
      // 每次 JWT 更新時同步 Student 檔案狀態（引導完成後自動帶上 studentId）
      if (token.id) {
        try {
          const { getPrismaClient } = await import('@/lib/db')
          const db = getPrismaClient()
          const [dbUser, student] = await Promise.all([
            db.user.findUnique({
              where: { id: token.id as string },
              select: { onboardingCompleted: true },
            }),
            db.student.findUnique({
              where: { userId: token.id as string },
              select: { id: true, grade: true, semester: true },
            }),
          ])
          token.studentId = student?.id ?? null
          token.grade = student?.grade ?? null
          token.semester = student?.semester ?? null
          token.onboardingCompleted = dbUser?.onboardingCompleted ?? false
        } catch {
          // DB 暫時不可用時保留舊 token，不阻擋登入流程
        }
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.studentId = (token.studentId as string | null) ?? null
        session.user.onboardingCompleted = (token.onboardingCompleted as boolean) ?? false
      }
      return session
    },
    async signIn({ user, account }) {
      return true
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  events: {
    async createUser({ user }) {
      console.log('New user created:', user.id)
    },
  },
  debug: process.env.NODE_ENV === 'development',
  secret: process.env.AUTH_SECRET,
})

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      role: string
      studentId: string | null
      onboardingCompleted: boolean
    }
  }
  interface User { role: string }
  interface JWT {
    id: string
    role: string
    accessToken?: string
    refreshToken?: string
    studentId?: string | null
    grade?: number | null
    semester?: number | null
    onboardingCompleted?: boolean
  }
}