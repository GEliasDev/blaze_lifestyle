import { Router } from "express";
import { authGuard, roleGuard } from "../../middleware/auth.js";
import { coachingController } from "./coaching.controller.js";

export const coachingRouter = Router(); // mounted at /api/coach
coachingRouter.use(authGuard, roleGuard("coach"));
coachingRouter.get("/clients", coachingController.listClients);
coachingRouter.get("/clients/:clientId/metrics", coachingController.getMetrics);
