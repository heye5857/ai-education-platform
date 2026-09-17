import pino, { Logger, LoggerOptions, Level } from 'pino'
import pretty from 'pino-pretty'

/**
 * 日誌等級類型
 */
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal' | 'silent'

/**
 * 日誌上下文介面
 */
export interface LogContext {
  module?: string
  userId?: string
  requestId?: string
  traceId?: string
  spanId?: string
  [key: string]: unknown
}

/**
 * 建立 Pino logger 選項
 */
function createLoggerOptions(module?: string): LoggerOptions {
  const isDevelopment = process.env.NODE_ENV === 'development'
  const logLevel = (process.env.LOG_LEVEL as Level) || (isDevelopment ? 'debug' : 'info')

  const baseOptions: LoggerOptions = {
    level: logLevel,
    base: {
      module: module || 'app',
      env: process.env.NODE_ENV || 'development',
      pid: process.pid,
      hostname: typeof window === 'undefined' ? require('os').hostname() : 'browser',
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label) => ({ level: label }),
      bindings: (bindings) => ({
        ...bindings,
        // 移除不必要的內建欄位
        pid: undefined,
        hostname: undefined,
      }),
    },
    redact: {
      paths: [
        '*.password',
        '*.secret',
        '*.token',
        '*.authorization',
        '*.cookie',
        '*.creditCard',
        '*.ssn',
        'req.headers.authorization',
        'req.headers.cookie',
        'res.headers["set-cookie"]',
      ],
      censor: '[REDACTED]',
    },
  }

  if (isDevelopment) {
    // 開發環境：使用 pretty print
    return {
      ...baseOptions,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
          singleLine: false,
          messageFormat: '{module} | {levelLabel} | {msg}',
        },
      },
    }
  }

  // 生產環境：結構化 JSON
  return baseOptions
}

/**
 * 全域 logger 實例快取
 */
const loggerCache = new Map<string, Logger>()

/**
 * 取得或建立 logger 實例
 */
export function getLogger(module?: string): Logger {
  const key = module || 'app'

  if (!loggerCache.has(key)) {
    const logger = pino(createLoggerOptions(module))
    loggerCache.set(key, logger)
  }

  return loggerCache.get(key)!
}

/**
 * 建立帶有上下文的 child logger
 */
export function createChildLogger(parent: Logger, context: LogContext): Logger {
  return parent.child(context)
}

/**
 * 預設 logger 實例
 */
export const logger = getLogger()

/**
 * 便利方法：建立帶有請求上下文的 logger
 */
export function createRequestLogger(requestId: string, userId?: string): Logger {
  return createChildLogger(logger, { requestId, userId })
}

/**
 * 便利方法：建立帶有模組上下文的 logger
 */
export function createModuleLogger(module: string): Logger {
  return getLogger(module)
}

/**
 * 結構化錯誤日誌
 */
export function logError(
  loggerInstance: Logger,
  error: Error | unknown,
  message: string,
  context?: LogContext
): void {
  const err = error instanceof Error ? error : new Error(String(error))
  loggerInstance.error(
    {
      err: {
        message: err.message,
        stack: err.stack,
        name: err.name,
        ...(err as unknown as Record<string, unknown>),
      },
      ...context,
    },
    message
  )
}

/**
 * 結構化資訊日誌
 */
export function logInfo(
  loggerInstance: Logger,
  message: string,
  context?: LogContext
): void {
  loggerInstance.info(context, message)
}

/**
 * 結構化警告日誌
 */
export function logWarn(
  loggerInstance: Logger,
  message: string,
  context?: LogContext
): void {
  loggerInstance.warn(context, message)
}

/**
 * 結構化除錯日誌
 */
export function logDebug(
  loggerInstance: Logger,
  message: string,
  context?: LogContext
): void {
  loggerInstance.debug(context, message)
}

/**
 * 效能計時器
 */
export function createTimer(loggerInstance: Logger, operation: string, context?: LogContext) {
  const start = process.hrtime.bigint()
  return {
    end: (message?: string, extraContext?: LogContext) => {
      const end = process.hrtime.bigint()
      const durationMs = Number(end - start) / 1_000_000
      loggerInstance.info(
        {
          operation,
          durationMs,
          ...context,
          ...extraContext,
        },
        message || `${operation} completed`
      )
      return durationMs
    },
  }
}

/**
 * 關閉所有 logger（應用關閉時呼叫）
 */
export async function shutdownLogger(): Promise<void> {
  await Promise.all(
    Array.from(loggerCache.values()).map((l) => l.flush())
  )
  loggerCache.clear()
}

export default logger