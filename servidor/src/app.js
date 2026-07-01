import express from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { config } from "./config.js";
import { errorHandler } from "./middleware/error.js";
import { generalLimiter } from "./middleware/rateLimit.js";
import { logger } from "./lib/logger.js";
import { authRouter } from "./modules/auth/auth.route.js";
import { clientEntriesRouter, coachEntriesRouter, photosRouter } from "./modules/nutrition/nutrition.route.js";
import { coachingRouter } from "./modules/coaching/coaching.route.js";
import { accountRouter } from "./modules/account/account.route.js";

export function createApp() {
  const app = express();

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(pinoHttp({ logger }));
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());
  app.use(generalLimiter);

  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
  app.use("/api/auth", authRouter);
  app.use("/api/me", clientEntriesRouter);
  app.use("/api/photos", photosRouter);
  app.use("/api/coach", coachingRouter);
  app.use("/api/coach", coachEntriesRouter);
  app.use("/api/me", accountRouter);
  app.use(errorHandler);
  return app;
}
