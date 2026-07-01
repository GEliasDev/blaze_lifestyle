import { Router } from "express";
import { authGuard, roleGuard } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { linkCoachSchema } from "../../shared/index.js";
import { accountController } from "./account.controller.js";

export const accountRouter = Router(); // mounted at /api/me
accountRouter.use(authGuard, roleGuard("client"));
accountRouter.get("/coach", accountController.getCoach);
accountRouter.post("/coach", validate(linkCoachSchema), accountController.linkCoach);
