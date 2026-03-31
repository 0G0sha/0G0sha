import { z } from 'zod'

export const PublishNotificationDTO = z.object({
     type: z.enum(['upload', 'comment', 'like', 'system']),
     title: z.string().min(1).max(200),
     message: z.string().min(1).max(1000),
})

export type PublishNotificationDTO = z.infer<typeof PublishNotificationDTO>

export const GetNotificationsDTO = z.object({
     page: z.coerce.number().int().min(1).optional(),
     limit: z.coerce.number().int().min(1).max(100).optional(),
     seen: z.enum(['true', 'false']).optional(),
})

export type GetNotificationsDTO = z.infer<typeof GetNotificationsDTO>
