import { z } from 'zod'

export const PublishNotificationDTO = z.object({
     type: z.enum(['upload', 'comment', 'like', 'system']),
     title: z.string().min(1).max(200),
     message: z.string().min(1).max(1000),
})

export type PublishNotificationDTO = z.infer<typeof PublishNotificationDTO>
