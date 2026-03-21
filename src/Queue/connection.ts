import type { ConnectionOptions } from "bullmq";

const redisUrl =
  process.env.NODE_ENV === "development"
    ? process.env.REDIS_HOST_LOCALHOST
    : process.env.REDIS_HOST;

const parsed = new URL(redisUrl ?? "redis://127.0.0.1:6379");

export const bullmqConnection: ConnectionOptions = {
  host: parsed.hostname,
  port: Number(parsed.port) || 6379,
  username: parsed.username || undefined,
  password: parsed.password || undefined,
};
