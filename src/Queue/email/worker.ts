import { Worker } from "bullmq";
import { createLogger } from "../../utils/logger";
import { bullmqConnection } from "../connection";
import { processEmailJob } from "./job";
import type { EmailJobData } from "./job";

const log = createLogger("EmailWorker");

export const emailWorker = new Worker<EmailJobData>(
  "email",
  async (job) => {
    await processEmailJob(job);
  },
  {
    connection: bullmqConnection,
    concurrency: 5,
  }
);

emailWorker.on("completed", (job) => {
  log.info({ jobId: job.id, name: job.name }, "Job completed");
});

emailWorker.on("failed", (job, err) => {
  log.error({ jobId: job?.id, name: job?.name, err }, "Job failed");
});

emailWorker.on("error", (err) => {
  log.error({ err }, "Worker error");
});

log.info("EmailWorker started — listening for jobs");
