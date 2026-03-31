import type { Request, RequestHandler, Response } from "express";
import { asyncHandler } from "../../../utils/api-requesthandler";

export const profileController: RequestHandler = asyncHandler(
     async (req: Request, res: Response) => {
          res.status(200).json({
               code: 200,
               status: "OK",
               timestamp: new Date(),
               success: true,
               error: false,
               message: "Profile fetched successfully",
               data: req.user
          })
          return
     }
)
