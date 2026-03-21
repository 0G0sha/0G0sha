import './config/dotenv'
import "reflect-metadata";
import { logger } from "./utils/logger";
process
     .on("unhandledRejection", (reason, promise) => {
          console.error(reason, "Unhandled Rejection at Promise", promise);
          logger.error({
               message: "Unhandled Rejection",
               reason: reason instanceof Error ? reason.message : reason,
               stack: reason instanceof Error ? reason.stack : undefined,
               promise
          });
     })
     .on("uncaughtException", (err) => {
          console.error(err, "\n Uncaught Exception thrown \n");
          logger.error({
               message: "Uncaught Exception",
               error: err.message,
               stack: err.stack
          });

          // allow logger to flush before exit
          setTimeout(() => {
               process.exit(1);
          }, 500);
     });
import express, { Express, Request, Response } from 'express'
import { mongoDBConfig, redisConfig } from '@/config';
import client from "prom-client";
import appConfig from '@/app.config';
import { setupSwagger } from './swagger';

const app: Express = express()

appConfig(app)
setupSwagger(app)

app.get('/metrics', async (_req: Request, res: Response) => {
     res.set('Content-Type', client.register.contentType);
     res.end(await client.register.metrics());
});

app.use(async (_req: Request, res: Response) => {
     res.status(404).send('This is not the API route you are looking for')
})
const PORT: number = Number(process.env.PORT) || 9999

async function startServer() {
     try {
          await Promise.all([
               mongoDBConfig().then(
                    () => {
                         app.listen(PORT, () => {
                              console.log("🌐 Server is running on:", process.env.NODE_ENV === "development" ? String(process.env.SITE_API_Local_URL) : String(process.env.SITE_API_URL))
                         });
                    }
               ).catch(err => {
                    logger.error({
                         message: "MongoDB connection failed",
                         error: err.message,
                         stack: err.stack
                    });
                    process.exit(1);
               }),
               redisConfig().catch(err => {
                    logger.error({
                         message: "Redis connection failed",
                         error: err.message,
                         stack: err.stack
                    });
                    process.exit(1);
               }),
          ]);
     } catch (error) {
          console.error("❌ Failed to start server:", error);
          process.exit(1);
     }
}

startServer();

export default app;
