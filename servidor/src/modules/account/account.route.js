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
accountRouter.use(authGuard, roleGuard("client"));
accountRouter.get("/coach", accountController.getCoach);
accountRouter.post("/coach", validate(linkCoachSchema), accountController.linkCoach);
accountRouter.get("/profile", accountController.getProfile);
accountRouter.patch("/profile", validate(updateProfileSchema), accountController.updateProfile);
accountRouter.post("/change-password", validate(changePasswordSchema), accountController.changePassword);
