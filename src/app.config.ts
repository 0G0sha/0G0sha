import express, { Application, NextFunction, Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import helmet from "helmet";
import { limiter } from "./utils/limit-request";
import client from "prom-client";
import * as useragent from "express-useragent";
import { logger } from "./utils/logger";

const register = new client.Registry();
client.collectDefaultMetrics({ register });

// metrics
const httpRequestsTotal = new client.Counter({
     name: "http_requests_total",
     help: "Total HTTP requests",
     labelNames: ["method", "route", "status"],
});
register.registerMetric(httpRequestsTotal);

// Histogram: HTTP request duration
const httpRequestDuration = new client.Histogram({
     name: "http_request_duration_seconds",
     help: "Duration of HTTP requests in seconds",
     labelNames: ["method", "route", "status"],
     buckets: [0.1, 0.5, 1, 1.5, 2, 5],
});
register.registerMetric(httpRequestDuration);

// Gauge: active requests count
const activeRequests = new client.Gauge({
     name: "active_requests",
     help: "Number of active HTTP requests",
});

register.registerMetric(activeRequests);

export const allowedOrigins: string[] = [
     process.env.SITE_URL_TEST as string,
     process.env.SITE_URL_LIVE as string,
     process.env.SITE_URL_LIVE_VERCEL as string,
     process.env.SITE_URL_LIVE_FLYIO as string,
     process.env.SITE_URL_LIVE_DASHBOARD as string,
     process.env.APS_SANDBOX_LINK as string,
     process.env.APS_LIVE_LINK as string,
];
export default (app: Application) => {

     const corsOptions: object = {
          origin: (origin: any, callback: any) => {
               if (!origin || origin === "null" || allowedOrigins.includes(origin)) {
                    callback(null, true);
               } else {
                    callback(new Error("Not allowed by CORS"));
               }
          },
          credentials: true,
          optionsSuccessState: 200,
     };

     app.use(
          helmet({
               contentSecurityPolicy: {
                    directives: {
                         defaultSrc: ["'self'"],
                         styleSrc: ["'self'", "'unsafe-inline'"],
                         scriptSrc: ["'self'"],
                         imgSrc: ["'self'", "data:", "https:"],
                         connectSrc: ["'self'", process.env.SITE_API_URL as string],
                    },
               },
               hsts: {
                    maxAge: 31536000, // 1 year
                    includeSubDomains: true,
                    preload: true,
               },
               referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
               permittedCrossDomainPolicies: { permittedPolicies: 'none' },
          })
     );
     app.use(
          express.json({
               limit: "75mb",
          })
     );
     app.use(
          express.urlencoded({
               extended: true,
          })
     );

     app.use("/v0/public", express.static("cdn"));
     app.use(cors(corsOptions));
     app.use(cookieParser());
     app.use(
          morgan(process.env.NODE_ENV === "development" ? "dev" : "combined", {
               stream: {
                    write: (message) => {
                         process.env.NODE_ENV === "development"
                              ? process.stdout.write(message)
                              : process.stdout.write(message) && logger.info(message.trim());
                    },
               },
          })
     );
     app.use(useragent.express());
     app.set("trust proxy", true);

     app.use(async (req: Request | any, res: Response, next: NextFunction) => {
          // get langouage of headers
          req.lang =
               req.headers["accept-language"] === "ar" ||
                    req.headers["accept-language"] === "en"
                    ? req.headers["accept-language"]
                    : ("en" as string);
          req.mobileApp =
               req.headers["app"] === "app" ? "app" : (req.headers["app"] as string);
          req.clientIP =
               req.headers["cf-connecting-ip"] ||
               req.headers["x-real-ip"] ||
               req.headers["x-forwarded-for"] ||
               req.socket.remoteAddress ||
               ("" as string);

          if (req.path === "/metrics") {
               return next();
          }
          activeRequests.inc();
          const end = httpRequestDuration.startTimer();

          res.on("finish", () => {
               activeRequests.dec();
               httpRequestsTotal
                    .labels(req.method, req.path, res.statusCode.toString())
                    .inc();
               end({
                    method: req.method,
                    route: req.originalUrl,
                    status: res.statusCode.toString(),
               });
          });
          next();
     });
     app.use(limiter);
};
