import { Request, Response, NextFunction, RequestHandler } from "express";

export const asyncHandler =
     (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>): RequestHandler =>
          async (req: Request, res: Response, next: NextFunction) =>
               await fn(req, res, next)
