import type { Request, RequestHandler, Response } from 'express'
import { asyncHandler } from '../../../utils/api-requesthandler'
import { NotificationHistoryService } from '../Service/notification-history.service'
import type { GetNotificationsDTO } from '../DTO/index.dto'

const service = new NotificationHistoryService()

export const getNotificationsController: RequestHandler = asyncHandler(
     async (req: Request, res: Response) => {
          const userId = req.user?._id as string
          const { page, limit, seen } = req.query as unknown as GetNotificationsDTO

          const result = await service.getNotifications(userId, { page, limit, seen })

          res.status(200).json({ success: true, ...result })
     },
)
