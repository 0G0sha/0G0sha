import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import type { NextFunction, Request, RequestHandler, Response } from 'express'
import { AppError } from '@/Shared/errors/app-error'
import { asyncHandler } from '@/utils/api-requesthandler'

export function validateDTO<T extends object>(DTOClass: new () => T): RequestHandler {
     return asyncHandler(
          async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
               const instance = plainToInstance(DTOClass, req.body)
               const errors = await validate(instance, {
                    whitelist: true,
                    forbidNonWhitelisted: false,
                    stopAtFirstError: false,
               })

               if (errors.length > 0) {
                    const messages = errors
                         .map((e) => Object.values(e.constraints ?? {}).join(', '))
                         .join('; ')
                    return next(AppError.badRequest(messages))
               }

               req.body = instance
               next()
          }
     )
}
