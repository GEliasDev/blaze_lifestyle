import { Router } from "express";
import { authGuard, roleGuard } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { acceptInviteSchema, createInviteSchema } from "./invitations.schema.js";
import { invitationsController } from "./invitations.controller.js";

// Coach-scoped router → mounted at /api/coach
export const coachInvitationsRouter = Router();
coachInvitationsRouter.post("/invitations", authGuard, roleGuard("coach"),
  validate(createInviteSchema), invitationsController.create);

// Public invite acceptance → mounted at /api/auth
export const inviteAcceptRouter = Router();
inviteAcceptRouter.get("/invitations/:token", invitationsController.preview);
inviteAcceptRouter.post("/invitations/:token/accept",
  validate(acceptInviteSchema), invitationsController.accept);
