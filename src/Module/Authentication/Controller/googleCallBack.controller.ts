import { NextFunction, Request, RequestHandler, Response } from "express";
import axios from "axios";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { asyncHandler } from "../../../utils/api-requesthandler";
import { AppError } from "../../../Shared/errors/app-error";
import { UserModel } from "../../User/Schema/user.schema";
import { token_PASETO } from "../utils/paseto.utils";


export const googleController: RequestHandler = asyncHandler(
     async (req: Request, res: Response, next: NextFunction) => {
          const { access_token } = req.body;
          const response = await axios.get(
               "https://www.googleapis.com/oauth2/v3/userinfo",
               { headers: { Authorization: `Bearer ${access_token}` } },
          );

          if (!response.data) {
               next(AppError.unauthorized("Google data verification failed"));
               return;
          }

          const googleUser = await response.data;
          const cUser = await UserModel.findOne(
               { email: googleUser.email.toLowerCase() },
               { _id: 1, tokenVersion: 1 },
          );
          if (cUser) {
               const tokenPayload = {
                    data: { user_id: cUser._id },
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

          const outputString = googleUser.name.replace(/\s/g, "-");
          const finalName = outputString + Math.floor(Math.random() * 10000001);
          const password = randomBytes(32).toString("hex");
          const salt = await bcrypt.genSalt(10);
          const hash = await bcrypt.hash(password, salt);

          const newUser = await UserModel.create({
               fullname: googleUser.given_name + " " + googleUser.family_name,
               email: googleUser.email,
               password: hash,
               username: finalName,
               googleId: googleUser.sub,
               avatar: googleUser.picture,
          });
          const tokenPayload = {
               data: { user_id: newUser._id },
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
