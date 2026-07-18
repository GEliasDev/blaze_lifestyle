import express from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { config } from "./config.js";
import { errorHandler } from "./middleware/error.js";
import { generalLimiter } from "./middleware/rateLimit.js";
import { logger } from "./lib/logger.js";
import { authRouter } from "./modules/auth/auth.route.js";
import { clientEntriesRouter, coachEntriesRouter } from "./modules/nutrition/nutrition.route.js";
import { clientExerciseRouter, coachExerciseRouter, tagsRouter } from "./modules/exercise/exercise.route.js";
import { photosRouter } from "./modules/photos/photos.route.js";
import { coachingRouter } from "./modules/coaching/coaching.route.js";
import { accountRouter } from "./modules/account/account.route.js";
import { moduleFlagsRouter, adminRouter } from "./modules/admin/admin.route.js";

export function createApp() {
  const app = express();

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(pinoHttp({ logger }));
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());
  app.use(generalLimiter);

  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
  app.use("/api/auth", authRouter);
  // accountRouter first: it only defines /coach, /profile, /change-password
  // and falls through for anything else, but clientEntriesRouter/
  // clientExerciseRouter apply roleGuard("client") via .use() — router-level
  // middleware that runs for EVERY request reaching that router, not just
  // its own defined routes. Mounted before accountRouter, that blanket guard
  // would reject a coach's /api/me/profile or /change-password request
  // before it ever reached the router that actually handles it.
  app.use("/api/me", accountRouter);
  app.use("/api/me", clientEntriesRouter);
  app.use("/api/me", clientExerciseRouter);
  app.use("/api/photos", photosRouter);
  app.use("/api/coach", coachingRouter);
  app.use("/api/coach", coachEntriesRouter);
  app.use("/api/coach", coachExerciseRouter);
  app.use("/api/exercise-tags", tagsRouter);
  app.use("/api/module-flags", moduleFlagsRouter);
  app.use("/api/admin", adminRouter);
  app.use(errorHandler);
  return app;
}
