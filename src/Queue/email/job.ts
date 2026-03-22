import type { Job } from 'bullmq'
import { createLogger } from '../../utils/logger'

const log = createLogger('EmailJob')

export type EmailJobType =
  | 'welcome'
  | 'reset-password'
  | 'verify-email'
  | 'notification';

export interface EmailJobData {
  type: EmailJobType;
  to: string;
  subject: string;
  body: string;
  meta?: Record<string, unknown>;
}

export async function processEmailJob(job: Job<EmailJobData>): Promise<void> {
  const { type, to, subject } = job.data

  log.info({ jobId: job.id, type, to, subject }, 'Processing email job')

  switch (type) {
    case 'welcome':
      await sendWelcomeEmail(job.data)
      break
    case 'reset-password':
      await sendResetPasswordEmail(job.data)
      break
    case 'verify-email':
      await sendVerifyEmail(job.data)
      break
    case 'notification':
      await sendNotificationEmail(job.data)
      break
    default:
      throw new Error(`Unknown email job type: ${type}`)
  }

  log.info({ jobId: job.id, type, to }, 'Email job completed')
}

async function sendWelcomeEmail(data: EmailJobData): Promise<void> {
  // TODO: integrate with email provider (e.g. Resend, Nodemailer, SendGrid)
  log.debug({ to: data.to }, 'Sending welcome email')
}

async function sendResetPasswordEmail(data: EmailJobData): Promise<void> {
  log.debug({ to: data.to }, 'Sending reset-password email')
}

async function sendVerifyEmail(data: EmailJobData): Promise<void> {
  log.debug({ to: data.to }, 'Sending verify-email')
}

async function sendNotificationEmail(data: EmailJobData): Promise<void> {
  log.debug({ to: data.to }, 'Sending notification email')
}
