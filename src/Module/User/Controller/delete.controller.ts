import type { NextFunction, Request, RequestHandler, Response } from 'express'
import { asyncHandler } from '../../../utils/api-requesthandler'
import { AppError } from '../../../gen-import'
import { BasedUserService } from '../Service/based-user.service'

export const deleteAccountController: RequestHandler = asyncHandler(
     async (req: Request, res: Response, next: NextFunction) => {
          const userId = req.user!._id as string
          if (userId !== req.params.id) {
               next(AppError.badRequest("U don't have any Primitions"))
               return
          }
          const userService = new BasedUserService()
          const result = await userService.delete_account(userId)

          if (!result) {
               next(AppError.notFound('User not found'))
               return
          }

          res.clearCookie('access_token')
          res.clearCookie('refresh_token')

          res.status(200).json({
               code: 200,
               status: 'OK',
               timestamp: new Date(),
               success: true,
               error: false,
               message: 'Account deleted successfully',
          })
     }
)
