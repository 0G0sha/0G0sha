import { Types } from 'mongoose'
import { createLogger } from '../../../utils/logger'
import { NotificationModel } from '../../../gen-app-config'
import { AppError } from '../../../Shared/errors/app-error'

const logger = createLogger('NotificationHistoryService')

export class NotificationHistoryService {
     async getNotifications(
          userId: string,
          params: { page?: number; limit?: number; seen?: 'true' | 'false' },
     ) {
          const page = Math.max(1, params.page ?? 1)
          const limit = Math.min(100, Math.max(1, params.limit ?? 10))
          const skip = (page - 1) * limit

          const matchStage: Record<string, unknown> = {
               userId: new Types.ObjectId(userId),
          }

          if (params.seen !== undefined) {
               matchStage.seen = params.seen === 'true'
          }

          const [result] = await NotificationModel.aggregate([
               { $match: matchStage },
               {
                    $facet: {
                         data: [
                              { $sort: { createdAt: -1 } },
                              { $skip: skip },
                              { $limit: limit },
                         ],
                         totalCount: [{ $count: 'count' }],
                         unseenCount: [
                              { $match: { seen: false } },
                              { $count: 'count' },
                         ],
                    },
               },
          ])

          const total: number = result.totalCount[0]?.count ?? 0
          const unseen: number = result.unseenCount[0]?.count ?? 0
          const totalPages = Math.ceil(total / limit)

          logger.info({ userId, page, limit }, 'Fetched notifications')

          return {
               data: result.data,
               meta: {
                    total,
                    unseen,
                    page,
                    limit,
                    totalPages,
                    hasNext: page < totalPages,
                    hasPrev: page > 1,
               },
          }
     }

     async markSeen(userId: string, notificationId: string) {
          const notification = await NotificationModel.findOneAndUpdate(
               { _id: notificationId, userId: new Types.ObjectId(userId) },
               { $set: { seen: true, seenAt: new Date() } },
               { new: true },
          )

          if (!notification) {
               throw AppError.notFound('Notification not found')
          }

          logger.info({ userId, notificationId }, 'Notification marked as seen')
          return notification
     }

     async markAllSeen(userId: string) {
          const result = await NotificationModel.updateMany(
               { userId: new Types.ObjectId(userId), seen: false },
               { $set: { seen: true, seenAt: new Date() } },
          )

          logger.info({ userId, updated: result.modifiedCount }, 'All notifications marked as seen')
          return { updated: result.modifiedCount }
     }
}
