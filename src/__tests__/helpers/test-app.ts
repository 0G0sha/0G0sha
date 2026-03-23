import express, { type Express, type Request, type Response } from 'express'
import appConfig from '../../app.config'
import appModule from '../../app.module'
import { errorHandler } from '../../Shared/errors/errorHandler'

/**
 * Creates a fresh Express app with all middleware and routes applied but
 * WITHOUT starting the HTTP server or connecting to any database.
 * Use this in endpoint tests via supertest.
 */
export function createTestApp(): Express {
  const app = express()

  appConfig(app)
  appModule(app)

  // 404 fallback — must come after routes are mounted
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ message: 'Route not found' })
  })

  // Global error handler
  app.use(errorHandler)

  return app
}
