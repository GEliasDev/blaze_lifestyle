import express from "express";
import cors from "cors";
import { config } from "./config.js";
import { errorHandler } from "./middleware/error.js";
import { authRouter } from "./modules/auth/auth.route.js";
import { clientEntriesRouter, coachEntriesRouter, photosRouter } from "./modules/nutrition/nutrition.route.js";
import { coachingRouter } from "./modules/coaching/coaching.route.js";
import { accountRouter } from "./modules/account/account.route.js";

export function createApp() {
  const app = express();
  // Dev-permissive CORS: reflect the request origin so the app works from
  // localhost and from a phone on the LAN. Lock this down to config.webOrigin
  // for production deployments.
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());
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
