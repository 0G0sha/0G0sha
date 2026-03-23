import type { NextFunction, Request, RequestHandler, Response } from 'express'
import { asyncHandler } from '../../../utils/api-requesthandler'
import { AppError, BasedAuthService } from '../../../the-import'
import type { RegisterDTO } from '../DTO/index.dto'

export const registerController: RequestHandler = asyncHandler(
     async (req: Request, res: Response, next: NextFunction) => {
          const data = req.body as RegisterDTO

          const baseAuth = new BasedAuthService()

          const user = await baseAuth.check_account(data.email)

          if (user) {
               next(AppError.badRequest('User already exists'))
               return
          }

          const new_user = await baseAuth.create_account(data)

          if (new_user.success) {
               res.cookie("access_token", new_user.access_token, { httpOnly: true, secure: true, sameSite: "strict", maxAge: 1000 * 60 * 60 * 2 });
               res.cookie("refresh_token", new_user.refresh_token, { httpOnly: true, secure: true, sameSite: "strict", maxAge: 1000 * 60 * 60 * 24 * 30, });
               res.status(201).json({ code: 201, status: "OK", success: true, error: false, message: "User created successfully", token: new_user.access_token })
               return
          }
     }
)
