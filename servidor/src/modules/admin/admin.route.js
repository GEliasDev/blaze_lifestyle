import { Router } from "express";
import { authGuard, roleGuard } from "../../middleware/auth.js";
import { adminController } from "./admin.controller.js";

// Readable by any authenticated role (client/coach/superuser) — the app needs
// this on every login to decide whether a module renders its real screens or
// the "working on it" placeholder.
export const moduleFlagsRouter = Router();
moduleFlagsRouter.use(authGuard);
moduleFlagsRouter.get("/", adminController.listModuleFlags);

// Superuser-only: flipping a module on/off.
export const adminRouter = Router();
adminRouter.use(authGuard, roleGuard("superuser"));
adminRouter.patch("/module-flags/:key", adminController.setModuleFlag);
