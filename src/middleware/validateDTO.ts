import type { NextFunction, Request, RequestHandler, Response } from 'express'
import type { ZodSchema } from 'zod'
import { asyncHandler } from '../utils/api-requesthandler'

export function validateDTO<T>(schema: ZodSchema<T>): RequestHandler {
     return asyncHandler(
          async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
               const result = schema.safeParse(req.body)

               if (!result.success) {
                    const messages = result.error.errors.map((e) => e.message).join('; ')
                    return next(AppError.badRequest(messages))
               }

               req.body = result.data
               next()
          }
     )
}
