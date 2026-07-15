import { Router } from "express";
import { z } from "zod";
import { authGuard, roleGuard } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { linkCoachSchema } from "../../shared/index.js";
import { accountController } from "./account.controller.js";

const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

export const accountRouter = Router(); // mounted at /api/me
accountRouter.use(authGuard);
// Linking to a coach only makes sense for clients.
accountRouter.get("/coach", roleGuard("client"), accountController.getCoach);
accountRouter.post("/coach", roleGuard("client"), validate(linkCoachSchema), accountController.linkCoach);
// Profile/password management applies to both clients and coaches.
accountRouter.get("/profile", accountController.getProfile);
accountRouter.patch("/profile", validate(updateProfileSchema), accountController.updateProfile);
accountRouter.post("/change-password", validate(changePasswordSchema), accountController.changePassword);
