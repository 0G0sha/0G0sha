import { NextFunction, Request, RequestHandler, Response } from "express";
import { asyncHandler } from "../../../utils/api-requesthandler";


export const googleController: RequestHandler = asyncHandler(
     async (req: Request, res: Response, next: NextFunction) => {
          const { access_token } = req.body

          const authService = new OauthService()

          const user = await authService.user_data(access_token);

          if (!user.googleUser) {
               next(AppError.unauthorized("Google data verification failed"));
               return;
          }

          if (user.data) {
               const tokenPayload = {
                    data: { user_id: user.data._id },
                    access_device: req.headers["user-agent"] as string,
               }

               const token = token_PASETO(tokenPayload, 'access')
               const refresh = token_PASETO(tokenPayload, 'refresh')


               res.cookie("access_token", token, {
                    httpOnly: true,
                    secure: true,
                    sameSite: "none",
                    maxAge: 1000 * 60 * 60 * 2,
               });
               res.cookie("refresh_token", refresh, {
                    httpOnly: true,
                    secure: true,
                    sameSite: "none",
                    maxAge: 1000 * 60 * 60 * 24,
               });
               res.status(201).json({
                    code: 201,
                    status: "Created",
                    message: "User created successfully",
                    account: "active",
                    token,
               });
               return;
          }

          const newUser = await authService.createNewAccount({
               name: user.googleUser.given_name + " " + user.googleUser.family_name,
               email: user.googleUser.email,
               sub: user.googleUser.sub,
               picture: user.googleUser.picture,
          });
          const tokenPayload = {
               data: { user_id: newUser.data._id },
               access_device: req.headers["user-agent"] as string,
          }

          const token = token_PASETO(tokenPayload, 'access')
          const refresh = token_PASETO(tokenPayload, 'refresh')


          res.cookie("access_token", token, {
               httpOnly: true,
               secure: true,
               sameSite: "none",
               maxAge: 1000 * 60 * 60 * 2,
          });
          res.cookie("refresh_token", refresh, {
               httpOnly: true,
               secure: true,
               sameSite: "none",
               maxAge: 1000 * 60 * 60 * 24,
          });
          res.status(201).json({
               code: 201,
               status: "Created",
               message: "User created successfully",
               token,
          });
          return;
     },
);
