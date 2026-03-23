import { createClient } from 'redis'

const client: any = createClient({
  url: process.env.NODE_ENV == 'development' ? process.env.REDIS_CACHE_DEV : process.env.REDIS_CACHE_LIVE,
  socket: {
    connectTimeout: 30000,
    reconnectStrategy: (retries) => Math.min(retries * 100, 3000),
  },
})

export const redisConfig = async (): Promise<void> => {
  try {
    await client.connect()
    console.log(`🛢️  Redis connected successfully: ${process.env.NODE_ENV === 'development' ? process.env.REDIS_CACHE_DEV : process.env.REDIS_CACHE_LIVE}`)
  } catch (err) {
    console.error('Redis connection error:', err)
    process.exit(1)
  }
}

client.on('error', (err: any) => console.log('Redis Client Error', err))

if (process.env.NODE_ENV !== 'development') {
  process.on('SIGTERM', async () => {
    await client.disconnect()
    console.log('Redis connection closed')
    process.exit(0)
  })
}

export default client
