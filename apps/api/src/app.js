import express from "express";
import cors from "cors";
import { config } from "./config.js";
import { errorHandler } from "./middleware/error.js";
import { authRouter } from "./modules/auth/auth.route.js";
import { coachInvitationsRouter, inviteAcceptRouter } from "./modules/invitations/invitations.route.js";

export function createApp() {
  const app = express();
  // Dev-permissive CORS: reflect the request origin so the app works from
  // localhost and from a phone on the LAN. Lock this down to config.webOrigin
  // for production deployments.
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());
  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
  app.use("/api/auth", authRouter);
  app.use("/api/auth", inviteAcceptRouter);
  app.use("/api/coach", coachInvitationsRouter);
  app.use(errorHandler);
  return app;
}
