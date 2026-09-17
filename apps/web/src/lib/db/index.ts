import { PrismaClient } from '@prisma/client'
import { getLogger } from '@ai-edu/logger'

const logger = getLogger('database')

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

let prismaClient: PrismaClient | undefined

export function getPrismaClient(): PrismaClient {
  if (!prismaClient) {
    prismaClient = globalForPrisma.prisma ?? new PrismaClient({
      log: [
        { level: 'query', emit: 'event' },
        { level: 'error', emit: 'event' },
        { level: 'warn', emit: 'event' },
      ],
    })

    // 將 Prisma 事件導向結構化 logger
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prismaClient.$on('query', (e: any) => {
      logger.debug({ query: e.query, params: e.params, duration: e.duration }, 'SQL query')
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prismaClient.$on('error', (e: any) => {
      logger.error({ error: e.message, target: e.target }, 'Prisma error')
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prismaClient.$on('warn', (e: any) => {
      logger.warn({ message: e.message, target: e.target }, 'Prisma warning')
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
  logger.error({ error: e }, 'Prisma Client connection failed')
})

export default prisma
export { prisma }