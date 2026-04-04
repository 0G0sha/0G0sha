import { NextFunction, Request, RequestHandler, Response } from "express";
import bcrypt from "bcryptjs"
import { asyncHandler } from "../../../utils/api-requesthandler";
import { LoginDTO } from "../DTO/index.dto";

export const loginController: RequestHandler = asyncHandler(
     async (req: Request, res: Response, next: NextFunction) => {
          const data = req.body as LoginDTO

          const baseAuth = new BasedAuthService()

          const check_user = await baseAuth.check_account(data.email)

          if (!check_user) {
               return next(new Error("User not found"))
          }

          const check_password = await bcrypt.compare(data.password, check_user.password)

          if (!check_password) {
               next(AppError.badRequest("Invalid password"))
               return
          }

          const token = await baseAuth.create_token({ _id: check_user._id.toString(), type: "access" })
          const refresh_token = await baseAuth.create_token({ _id: check_user._id.toString(), type: "refresh" })

          res.cookie("access_token", token, { httpOnly: true, secure: true, sameSite: "strict", maxAge: 1000 * 60 * 60 * 2 });
          res.cookie("refresh_token", refresh_token, { httpOnly: true, secure: true, sameSite: "strict", maxAge: 1000 * 60 * 60 * 24 * 30, });
          res.status(200).json({ code: 200, status: "OK", timestamp: new Date(), success: true, error: false, message: "User logged in successfully", token })
          return
     }
)
