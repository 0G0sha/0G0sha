import type { NextFunction, Request, RequestHandler, Response } from 'express'

export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>): RequestHandler =>
    async (req: Request, res: Response, next: NextFunction) =>
      fn(req, res, next)
