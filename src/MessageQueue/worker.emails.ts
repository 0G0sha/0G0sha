import "../config/dotenv"
import { Worker, Job } from "bullmq";
import { jobProcessor } from './jobs/job.process.emails';

const worker = new Worker("emailQueue", jobProcessor, {
     connection: {
          url: process.env.NODE_ENV === "development" ? process.env.REDIS_CACHE_DEV : process.env.REDIS_CACHE_LIVE,
     },
});

worker.on("completed", (job) => {
     job.updateProgress(100);
});

worker.on("failed", (job: Job | undefined, err: Error, _prev: string) => {
     if (job) {
          console.error(`Failed to send email to ${job.data.email}:`, err);
     } else {
          console.error(`Failed to send email: job is undefined`, err);
     }
});
