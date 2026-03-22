import { Queue } from 'bullmq'
import { createLogger } from '../../utils/logger'
import { bullmqConnection } from '../connection'
import type { EmailJobData } from './job'

const log = createLogger('EmailQueue')

export const emailQueue = new Queue<EmailJobData>('email', {
  connection: bullmqConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
  },
})

emailQueue.on('error', (err) => {
  log.error({ err }, 'EmailQueue error')
})

log.info('EmailQueue initialized')
