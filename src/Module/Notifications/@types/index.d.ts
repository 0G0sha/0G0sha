import type { Response as ExpressResponse } from 'express';

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
