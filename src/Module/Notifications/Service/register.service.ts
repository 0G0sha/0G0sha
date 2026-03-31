import type { Response } from 'express';
import { createClient, RedisClientType } from 'redis';
import { NotificationPayload, SSEClient } from '../@types';
import { formatSSEEvent, formatHeartbeat } from '../Utils/sseFormat';

const clients = new Map<string, SSEClient>();

const getRedisUrl = (): string =>
     process.env.NODE_ENV === 'development'
          ? (process.env.REDIS_CACHE_DEV as string)
          : (process.env.REDIS_CACHE_LIVE as string);

export const registerClient = async (
     userId: string,
     res: Response,
     lastEventId?: string
): Promise<void> => {
     // If user already has an active connection, close it
     const existing = clients.get(userId);
     if (existing) {
          existing.res.end();
          clients.delete(userId);
     }

     const subscriber: RedisClientType = createClient({ url: getRedisUrl() });
     await subscriber.connect();

     const client: SSEClient = { userId, res, lastEventId };
     clients.set(userId, client);

     await subscriber.subscribe(`notifications:${userId}`, (message: string) => {
          try {
               const payload: NotificationPayload = JSON.parse(message);
               res.write(formatSSEEvent(payload));
          } catch {
               // malformed message — skip
          }
     });

     // Heartbeat every 25s to prevent proxy/LB timeouts
     const heartbeat = setInterval(() => {
          res.write(formatHeartbeat());
     }, 25_000);

     // Cleanup on disconnect
     res.on('close', async () => {
          clearInterval(heartbeat);
          clients.delete(userId);
          await subscriber.unsubscribe(`notifications:${userId}`);
          await subscriber.disconnect();
     });
};

export const getActiveClients = (): number => clients.size;
