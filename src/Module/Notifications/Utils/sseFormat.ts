import { NotificationPayload } from '../@types';

export const formatSSEEvent = (payload: NotificationPayload): string => {
     return [
          `id: ${payload.id}`,
          `event: notification`,
          `retry: 3000`,
          `data: ${JSON.stringify(payload)}`,
          '',
          '',
     ].join('\n');
};

export const formatHeartbeat = (): string => ': heartbeat\n\n';
