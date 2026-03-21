import "../config/dotenv";
import { emailWorker } from "./email";
import { createLogger } from "@/utils/logger";

const log = createLogger("Queue");

const shutdown = async () => {
  log.info("Shutting down all workers...");
  await emailWorker.close();
  process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

log.info("All queue workers started");
