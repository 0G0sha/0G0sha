import { asyncHandler } from "../../../utils/api-requesthandler";
import { BasedAuthService } from "../Service/based-auth.service";
import type { NextFunction, Request, RequestHandler, Response } from "express";

export const forgetPasswordController: RequestHandler = asyncHandler(
     async (req: Request, res: Response, _next: NextFunction) => {
          const data = req.body as { email: string }
          const baseAuth = new BasedAuthService()
          const user = await baseAuth.forget_password(data.email)
          if (user.success) {
               res.status(200).json({ code: 200, status: "OK", timestamp: new Date(), success: true, error: false, message: "User forget password", token: user.token })
               return
          }
     }
)
