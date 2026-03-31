import type { Response as ExpressResponse } from 'express';
import type { Document, Types } from 'mongoose';

export interface SSEClient {
     userId: string;
     res: ExpressResponse;
     lastEventId?: string;
}

export interface NotificationPayload {
     id: string;
     type: 'upload' | 'comment' | 'like' | 'system';
     title: string;
     message: string;
     createdAt: string;
}

export interface INotification extends Document {
     userId: Types.ObjectId;
     type: 'upload' | 'comment' | 'like' | 'system';
     title: string;
     message: string;
     seen: boolean;
     seenAt?: Date;
}
