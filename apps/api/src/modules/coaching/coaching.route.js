import { Router } from "express";
import { authGuard, roleGuard } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { commentSchema, complianceSchema } from "./coaching.schema.js";
import { coachingController } from "./coaching.controller.js";

export const coachingRouter = Router(); // mounted at /api/coach
coachingRouter.use(authGuard, roleGuard("coach"));
coachingRouter.get("/clients", coachingController.listClients);
coachingRouter.get("/clients/:clientId", coachingController.getClient);
coachingRouter.get("/clients/:clientId/entries", coachingController.clientEntries);
coachingRouter.get("/clients/:clientId/entries/:entryId", coachingController.clientEntry);
coachingRouter.post("/entries/:entryId/comments", validate(commentSchema), coachingController.addComment);
coachingRouter.patch("/entries/:entryId/compliance", validate(complianceSchema), coachingController.confirmCompliance);
