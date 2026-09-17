import { NextRequest, NextResponse } from 'next/server'
import { getLogger, createRequestLogger, logInfo, logError, LogContext } from '@ai-edu/logger'

/**
 * 請求 ID 產生器
 */
function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
}

/**
 * 從請求取得用戶 ID（如果已認證）
 */
function getUserIdFromRequest(request: NextRequest): string | undefined {
  // 這裡可以根據你的認證方式調整
  // 例如從 JWT token、session cookie 等取得
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    // 可以解析 JWT 取得 userId
    // const token = authHeader.substring(7)
    // const payload = decodeJwt(token)
    // return payload.sub
  }
  return undefined
}

/**
 * 記錄請求開始
 */
function logRequestStart(request: NextRequest, requestId: string): void {
  const logger = createRequestLogger(requestId, getUserIdFromRequest(request))
  const context: LogContext = {
    method: request.method,
    url: request.url,
    path: request.nextUrl.pathname,
    search: request.nextUrl.search,
    userAgent: request.headers.get('user-agent'),
    referer: request.headers.get('referer'),
    ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
  }
  logInfo(logger, 'Incoming request', context)
}

/**
 * 記錄請求完成
 */
function logRequestEnd(
  request: NextRequest,
  response: NextResponse,
  requestId: string,
  durationMs: number
): void {
  const logger = createRequestLogger(requestId, getUserIdFromRequest(request))
  const context: LogContext = {
    method: request.method,
    path: request.nextUrl.pathname,
    status: response.status,
    durationMs,
    contentLength: response.headers.get('content-length'),
  }

  if (response.status >= 400) {
    logError(logger, 'Request completed', context)
  } else {
    logInfo(logger, 'Request completed', context)
  }
}

/**
 * Next.js Middleware - 請求日誌記錄
 */
export function requestLoggingMiddleware(request: NextRequest): NextResponse {
  const requestId = generateRequestId()
  const startTime = process.hrtime.bigint()

  // 記錄請求開始
  logRequestStart(request, requestId)

  // 將 requestId 加入回應標頭
  const response = NextResponse.next()
  response.headers.set('x-request-id', requestId)

  // 使用 response hook 記錄完成
  const originalJson = response.json.bind(response)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  response.json = async (data: any) => {
    const endTime = process.hrtime.bigint()
    const durationMs = Number(endTime - startTime) / 1_000_000
    logRequestEnd(request, response, requestId, durationMs)
    return originalJson(data)
  }

  return response
}

/**
 * API Route 專用 logger 建立器
 * 在 API route 中使用：const logger = createApiLogger(request)
 */
export function createApiLogger(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || generateRequestId()
  return createRequestLogger(requestId, getUserIdFromRequest(request))
}

/**
 * 包裝 API handler 自動記錄請求/回應/錯誤
 */
export function withLogging<T extends unknown[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>,
  module?: string
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    const logger = module ? getLogger(module) : getLogger()
    const apiLogger = createApiLogger(request)
    const requestId = apiLogger.bindings().requestId as string
    const startTime = process.hrtime.bigint()

    const startContext: LogContext = {
      method: request.method,
      path: request.nextUrl.pathname,
    }
    logInfo(apiLogger, 'API handler started', startContext)

    try {
      const response = await handler(request, ...args)
      const endTime = process.hrtime.bigint()
      const durationMs = Number(endTime - startTime) / 1_000_000

      const completeContext: LogContext = {
        method: request.method,
        path: request.nextUrl.pathname,
        status: response.status,
        durationMs,
      }
      logInfo(apiLogger, 'API handler completed', completeContext)

      response.headers.set('x-request-id', requestId)
      return response
    } catch (error) {
      const endTime = process.hrtime.bigint()
      const durationMs = Number(endTime - startTime) / 1_000_000

      const errorContext: LogContext = {
        method: request.method,
        path: request.nextUrl.pathname,
        durationMs,
      }
      logError(apiLogger, error, 'API handler failed', errorContext)

      throw error
    }
  }
}