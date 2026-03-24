import { NextFunction, Request, RequestHandler, Response } from "express";
import { BasedAuthService } from "../auth.service";
import { asyncHandler } from "../../../utils/api-requesthandler";

export const resetPasswordController: RequestHandler = asyncHandler(
     async (req: Request, res: Response, _next: NextFunction) => {
          const data = req.body as { token: string; password: string }
          const baseAuth = new BasedAuthService()
          await baseAuth.reset_password(data)
          res.status(200).json({ code: 200, status: "OK", timestamp: new Date(), success: true, error: false, message: "User reset password" })
          return
     }
)
