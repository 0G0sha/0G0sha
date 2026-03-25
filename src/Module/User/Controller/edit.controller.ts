import type { NextFunction, Request, RequestHandler, Response } from 'express'
import { asyncHandler } from '../../../utils/api-requesthandler'
import { AppError, uploadToCloudinary } from '../../../gen-import'
import type { EditProfileDTO } from '../DTO/index.dto'
import { BasedUserService } from '../Service/based-user.service'

export const editProfileController: RequestHandler = asyncHandler(
     async (req: Request, res: Response, next: NextFunction) => {
          const data = req.body as EditProfileDTO
          const userId = req.user!._id as string

          if (req.file) {
               const result = await uploadToCloudinary(req.file.buffer, {
                    folder: 'avatars',
                    transformation: { width: 400, height: 400, crop: 'fill', gravity: 'face' },
               });
               (data as EditProfileDTO & { avatar?: string }).avatar = result.secure_url
          }

          const userService = new BasedUserService()
          const user = await userService.edit_profile(userId, data as EditProfileDTO & { avatar?: string })

          if (!user) {
               next(AppError.notFound('User not found'))
               return
          }

          res.status(200).json({
               code: 200,
               status: 'OK',
               timestamp: new Date(),
               success: true,
               error: false,
               message: 'Profile updated successfully',
               data: user,
          })
     }
)
