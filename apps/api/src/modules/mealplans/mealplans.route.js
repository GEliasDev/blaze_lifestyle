import { Router } from "express";
import { authGuard, roleGuard } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { createPlanSchema, planItemSchema } from "./mealplans.schema.js";
import { mealplansController } from "./mealplans.controller.js";

export const coachPlansRouter = Router(); // mounted at /api/coach
coachPlansRouter.use(authGuard, roleGuard("coach"));
coachPlansRouter.get("/clients/:clientId/plan", mealplansController.getClientPlan);
coachPlansRouter.post("/clients/:clientId/plan", validate(createPlanSchema), mealplansController.createPlan);
coachPlansRouter.post("/plans/:planId/items", validate(planItemSchema), mealplansController.addItem);
coachPlansRouter.patch("/plan-items/:itemId", validate(planItemSchema), mealplansController.updateItem);
coachPlansRouter.delete("/plan-items/:itemId", mealplansController.deleteItem);

export const clientPlanRouter = Router(); // mounted at /api/me
clientPlanRouter.use(authGuard, roleGuard("client"));
clientPlanRouter.get("/plan", mealplansController.myPlan);
clientPlanRouter.get("/plan/today", mealplansController.myToday);
