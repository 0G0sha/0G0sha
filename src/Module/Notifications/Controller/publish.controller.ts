import type { Request, RequestHandler, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { asyncHandler } from '../../../utils/api-requesthandler'
import { publishNotification } from '../Service/public.service'
import type { PublishNotificationDTO } from '../DTO/index.dto'

export const publishController: RequestHandler = asyncHandler(
     async (req: Request, res: Response) => {
          const userId = req.user?._id as string
          const { type, title, message } = req.body as PublishNotificationDTO

          const payload = {
               id: uuidv4(),
               type,
               title,
               message,
               createdAt: new Date().toISOString(),
          }

          await publishNotification(userId, payload)

          res.status(200).json({ success: true, data: payload })
     }
)
