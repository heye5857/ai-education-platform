import { NextRequest, NextResponse } from 'next/server'
import { getLogger, logInfo, logError, logWarn, createTimer } from '@ai-edu/logger'
import { createApiLogger } from './middleware'

/**
 * API 回應類型
 */
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: unknown
  }
  meta?: {
    requestId: string
    timestamp: string
    durationMs: number
  }
}

/**
 * 建立成功回應
 */
export function createSuccessResponse<T>(
  data: T,
  requestId: string,
  durationMs: number
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
        durationMs,
      },
    },
    { headers: { 'x-request-id': requestId } }
  )
}

/**
 * 建立錯誤回應
 */
export function createErrorResponse(
  code: string,
  message: string,
  requestId: string,
  durationMs: number,
  status: number = 400,
  details?: unknown
): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      success: false,
      error: { code, message, details },
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
        durationMs,
      },
    },
    { status, headers: { 'x-request-id': requestId } }
  )
}

/**
 * 非同步處理器類型
 * Handler 可以回傳任意資料，會被自動包裝為標準回應格式
 * 也可以直接回傳 NextResponse 以完全控制回應
 */
export type AsyncHandler<T = unknown> = (
  request: NextRequest,
  context: {
    logger: ReturnType<typeof createApiLogger>
    requestId: string
    timer: ReturnType<typeof createTimer>
  }
) => Promise<T | NextResponse>

/**
 * 包裝 API handler - 自動處理日誌、計時、錯誤、統一回應格式
 */
export function defineApiHandler<T = unknown>(
  handler: AsyncHandler<T>,
  module?: string
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const baseLogger = module ? getLogger(module) : getLogger()
    const logger = createApiLogger(request)
    const requestId = logger.bindings().requestId as string
    const timer = createTimer(logger, `API ${request.method} ${request.nextUrl.pathname}`, { module })
    const startTime = process.hrtime.bigint()

    logInfo(logger, 'API request started', {
      method: request.method,
      path: request.nextUrl.pathname,
      searchParams: Object.fromEntries(request.nextUrl.searchParams),
    })

    try {
      const result = await handler(request, { logger, requestId, timer })

      // 如果 handler 直接回傳 NextResponse，直接返回
      if (result instanceof NextResponse) {
        const durationMs = timer.end('API request completed', { status: result.status })
        result.headers.set('x-request-id', requestId)
        return result
      }

      // 否則包裝為標準成功回應
      const durationMs = timer.end('API request completed', { status: 200 })
      return createSuccessResponse(result.data, requestId, durationMs)
    } catch (error) {
      const durationMs = timer.end('API request failed', { status: 500 })

      // 已知錯誤類型處理
      if (error instanceof ApiError) {
        logWarn(logger, 'API known error', {
          code: error.code,
          message: error.message,
          status: error.status,
          durationMs,
        })
        return createErrorResponse(
          error.code,
          error.message,
          requestId,
          durationMs,
          error.status,
          error.details
        )
      }

      // 未預期錯誤
      logError(logger, error, 'API unexpected error', {
        method: request.method,
        path: request.nextUrl.pathname,
        durationMs,
      })

      return createErrorResponse(
        'INTERNAL_ERROR',
        process.env.NODE_ENV === 'development'
          ? error instanceof Error
            ? error.message
            : 'Internal server error'
          : 'Internal server error',
        requestId,
        durationMs,
        500
      )
    }
  }
}

/**
 * 自定義 API 錯誤類別
 */
export class ApiError extends Error {
  public readonly code: string
  public readonly status: number
  public readonly details?: unknown

  constructor(code: string, message: string, status: number = 400, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.details = details

    // 維持原型鏈
    Object.setPrototypeOf(this, ApiError.prototype)
  }

  static badRequest(message: string, details?: unknown): ApiError {
    return new ApiError('BAD_REQUEST', message, 400, details)
  }

  static unauthorized(message: string = 'Unauthorized', details?: unknown): ApiError {
    return new ApiError('UNAUTHORIZED', message, 401, details)
  }

  static forbidden(message: string = 'Forbidden', details?: unknown): ApiError {
    return new ApiError('FORBIDDEN', message, 403, details)
  }

  static notFound(message: string = 'Not found', details?: unknown): ApiError {
    return new ApiError('NOT_FOUND', message, 404, details)
  }

  static conflict(message: string, details?: unknown): ApiError {
    return new ApiError('CONFLICT', message, 409, details)
  }

  static validationError(message: string, details?: unknown): ApiError {
    return new ApiError('VALIDATION_ERROR', message, 422, details)
  }

  static tooManyRequests(message: string = 'Too many requests', details?: unknown): ApiError {
    return new ApiError('TOO_MANY_REQUESTS', message, 429, details)
  }

  static internal(message: string = 'Internal server error', details?: unknown): ApiError {
    return new ApiError('INTERNAL_ERROR', message, 500, details)
  }

  static serviceUnavailable(message: string = 'Service unavailable', details?: unknown): ApiError {
    return new ApiError('SERVICE_UNAVAILABLE', message, 503, details)
  }
}

/**
 * 常用驗證輔助函數
 */
export async function validateRequest<T>(
  request: NextRequest,
  schema: { parse: (data: unknown) => T },
  logger: ReturnType<typeof createApiLogger>
): Promise<T> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    throw ApiError.badRequest('Invalid JSON body')
  }

  try {
    return schema.parse(body)
  } catch (error) {
    logWarn(logger, 'Request validation failed', { error: String(error) })
    throw ApiError.validationError('Validation failed', error)
  }
}

/**
 * 取得查詢參數
 */
export function getQueryParams(request: NextRequest): Record<string, string> {
  return Object.fromEntries(request.nextUrl.searchParams)
}

/**
 * 取得路徑參數 (從 Next.js 14 的 dynamic route)
 */
export function getPathParams(request: NextRequest): Record<string, string> {
  // 這需要在 route.ts 中手動傳入 params
  // 這裡提供作為參考
  return {}
}