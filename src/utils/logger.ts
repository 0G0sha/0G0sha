import pino, { type Logger, type LoggerOptions } from 'pino'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

const isDev = process.env.NODE_ENV === 'development'
const isTest = process.env.NODE_ENV === 'test'

const LOG_DIR = resolve(process.cwd(), 'logs')
const LOG_FILE = resolve(LOG_DIR, 'app.log')

// Ensure the logs/ directory exists at startup
mkdirSync(LOG_DIR, { recursive: true })

const targets: LoggerOptions['transport'] = {
  targets: [
    // ── Console transport ──────────────────────────────────────
    ...(isTest
      ? [] // silence console output during tests
      : isDev
        ? [
          {
            target: 'pino-pretty',
            level: 'debug',
            options: {
              colorize: true,
              translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
              ignore: 'pid,hostname',
              singleLine: false,
              destination: 1, // stdout
            },
          },
        ]
        : [
          {
            target: 'pino/file',
            level: 'info',
            options: { destination: 1 }, // stdout (JSON)
          },
        ]),

    // ── File transport (always active, JSON lines) ─────────────
    {
      target: 'pino/file',
      level: isDev ? 'debug' : 'info',
      options: { destination: LOG_FILE, mkdir: true },
    },
  ],
}

const options: LoggerOptions = {
  level: process.env.LOG_LEVEL ?? (isDev ? 'debug' : 'info'),
  base: isDev ? undefined : { service: process.env.npm_package_name ?? 'app' },
  timestamp: pino.stdTimeFunctions.isoTime,
  transport: targets,
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
