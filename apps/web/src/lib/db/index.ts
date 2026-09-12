import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })
}

let prismaClient: PrismaClient | undefined

export function getPrismaClient(): PrismaClient {
  if (!prismaClient) {
    prismaClient = globalForPrisma.prisma ?? new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    })
    if (process.env.NODE_ENV !== 'production') {
      globalForPrisma.prisma = prismaClient
    }
  }
  return prismaClient
}

// 確保 Prisma Client 在模組載入時就初始化並連線
const prisma = getPrismaClient()

// 確保連線建立
prisma.$connect().catch((e) => {
  console.error('Prisma Client connection failed:', e)
})

export default prisma
export { prisma }