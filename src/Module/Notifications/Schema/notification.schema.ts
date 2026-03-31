import { model, Schema } from 'mongoose'
import type { INotification } from '../@types'

const notificationSchema = new Schema<INotification>(
     {
          userId: {
               type: Schema.Types.ObjectId,
               ref: 'User',
               required: true,
          },
          type: {
               type: String,
               enum: ['upload', 'comment', 'like', 'system'],
               required: true,
          },
          title: {
               type: String,
               required: true,
               trim: true,
               maxlength: 200,
          },
          message: {
               type: String,
               required: true,
               trim: true,
               maxlength: 1000,
          },
          seen: {
               type: Boolean,
               default: false,
          },
          seenAt: {
               type: Date,
               default: null,
          },
     },
     { timestamps: true },
)

notificationSchema.index({ userId: 1, createdAt: -1 })
notificationSchema.index({ userId: 1, seen: 1 })

export const NotificationModel = model<INotification>('Notification', notificationSchema)
