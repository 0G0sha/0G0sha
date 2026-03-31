import { createClient, RedisClientType } from 'redis';
import { NotificationPayload } from '../@types';

const getRedisUrl = (): string =>
     process.env.NODE_ENV === 'development'
          ? (process.env.REDIS_CACHE_DEV as string)
          : (process.env.REDIS_CACHE_LIVE as string);

let publisher: RedisClientType;

const getPublisher = async (): Promise<RedisClientType> => {
     if (!publisher || !publisher.isOpen) {
          publisher = createClient({ url: getRedisUrl() });
          await publisher.connect();
     }
     return publisher;
};

// Call this from any BullMQ worker or service
export const publishNotification = async (
     userId: string,
     payload: NotificationPayload
): Promise<void> => {
     const pub = await getPublisher();
     await pub.publish(`notifications:${userId}`, JSON.stringify(payload));
};
