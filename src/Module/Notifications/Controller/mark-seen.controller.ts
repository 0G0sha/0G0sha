import type { Request, RequestHandler, Response } from 'express'
import { asyncHandler } from '../../../utils/api-requesthandler'
import { NotificationHistoryService } from '../Service/notification-history.service'

const service = new NotificationHistoryService()

export const markSeenController: RequestHandler = asyncHandler(
     async (req: Request, res: Response) => {
          const userId = req.user?._id as string
          const id = req.params.id as string

          const notification = await service.markSeen(userId, id)

          res.status(200).json({ success: true, data: notification })
     },
)

export const markAllSeenController: RequestHandler = asyncHandler(
     async (req: Request, res: Response) => {
          const userId = req.user?._id as string

          const result = await service.markAllSeen(userId)

          res.status(200).json({ success: true, data: result })
     },
)
