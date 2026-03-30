export interface SSEClient {
     userId: string;
     res: Response;
     lastEventId?: string;
}

export interface NotificationPayload {
     id: string;
     type: 'upload' | 'comment' | 'like' | 'system';
     title: string;
     message: string;
     createdAt: string;
}
