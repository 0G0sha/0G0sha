import { NextFunction, Request, RequestHandler, Response } from "express";
import { createPublicKey } from "node:crypto";
import { V4 } from "paseto"
import { asyncHandler } from "../utils/api-requesthandler";

export const userMiddleware: RequestHandler = asyncHandler(
     async (req: Request, res: Response, next: NextFunction) => {
          const authHeader = req.headers.authorization;
          const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

          if (!token) {
               res.status(401).json({ code: 401, status: "Unauthorized", timestamp: new Date(), success: false, error: true, message: "Please login first" });
               return
          }
          const publicKey = createPublicKey(process.env.ACCESS_PUBLICE_KEY as string)
          await V4.verify(token, publicKey).then(async (payload: any) => {

               const user = await UserModel.findOne({ _id: payload.data.user_id }, { _id: 1 })
               if (!user) {
                    next(new AppError("User not found", 404))
                    return
               }
               req.user = user
               next()
               return
          }).catch((err) => {
               next(new AppError(`Invalid access token: ${err}`, 401))
               return
          })
     }
)
