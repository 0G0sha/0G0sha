import { NextFunction, Request, Response, RequestHandler } from "express"
import { createPublicKey } from "node:crypto"
import { V4 } from "paseto"
import { asyncHandler } from "../../../utils/api-requesthandler"
import { AppError } from "../../../Shared/errors/app-error"
import { UserModel } from "../../User/Schema/user.schema"
import { token_PASETO } from "../utils/paseto.utils"

export const refreshController: RequestHandler = asyncHandler(
     async (req: Request, res: Response, next: NextFunction) => {
          const token: undefined = req.cookies.refresh_token

          if (!token) {
               next(AppError.badRequest("Refresh token not found"))
               return
          }
          const publicKey = createPublicKey(process.env.PUBLIC_REFRESH_TOKEN_SECRET as string)
          await V4.verify(token, publicKey).then(async (payload: any) => {
               const user = await UserModel.findOne({ _id: payload.data.user_id }, { _id: 1 })
               if (!user) {
                    next(AppError.notFound("User not found"))
                    return
               }

               // calculate remaining time for the refresh token
               const expireDate: Date = new Date(payload.exp)
               const remainingMs: number = expireDate.getTime() - Date.now()
               const remainingDays: number = Math.floor(remainingMs / (1000 * 60 * 60 * 24))

               const token: string = await token_PASETO({ data: { user_id: user._id } }, "access")
               const tokenRefresh: string = await token_PASETO({ data: { user_id: user._id } }, "refresh", `${remainingDays}d`)
               res.cookie("access_token", token, { httpOnly: true, secure: true, sameSite: "strict", maxAge: remainingMs })
               res.cookie("refresh_token", tokenRefresh, { httpOnly: true, secure: true, sameSite: "strict", maxAge: remainingMs })
               res.status(200).json({ code: 200, status: "OK", message: "Refresh token successful" })
               return
          }).catch((err) => {
               next(AppError.unauthorized(`Invalid refresh token: ${err}`))
               return
          })
     }
)
