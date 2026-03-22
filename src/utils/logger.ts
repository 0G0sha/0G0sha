import pino, { type Logger, type LoggerOptions } from 'pino'

const isDev = process.env.NODE_ENV === 'development'

const transport: LoggerOptions['transport'] = isDev
  ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
      ignore: 'pid,hostname',
      singleLine: false,
    },
  }
  : undefined

const options: LoggerOptions = {
  level: process.env.LOG_LEVEL ?? (isDev ? 'debug' : 'info'),
  base: isDev ? undefined : { service: process.env.npm_package_name ?? 'app' },
  timestamp: pino.stdTimeFunctions.isoTime,
  transport,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      '*.password',
      '*.token',
      '*.secret',
    ],
    censor: '[REDACTED]',
  },
}

export const logger: Logger = pino(options)

/**
 * Create a child logger scoped to a specific module/context.
 * @example
 *   const log = createLogger("AuthService");
 *   log.info("user logged in");
 */
export const createLogger = (context: string): Logger =>
  logger.child({ context })
