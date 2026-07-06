import { Router } from "express";
import multer from "multer";
import { authGuard, roleGuard } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { createEntrySchema, MAX_PHOTOS } from "./nutrition.schema.js";
import { nutritionController, coachNutritionController } from "./nutrition.controller.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const photos = upload.array("photos", MAX_PHOTOS);

export const clientEntriesRouter = Router(); // mounted at /api/me
clientEntriesRouter.use(authGuard, roleGuard("client"));
clientEntriesRouter.get("/entries", nutritionController.list);
clientEntriesRouter.post("/entries", photos, validate(createEntrySchema), nutritionController.create);
clientEntriesRouter.get("/entries/:id", nutritionController.get);
clientEntriesRouter.patch("/entries/:id", photos, nutritionController.update);
clientEntriesRouter.delete("/entries/:id", nutritionController.remove);

// Coach acting on a client's entries: mounted at /api/coach
export const coachEntriesRouter = Router();
coachEntriesRouter.use(authGuard, roleGuard("coach"));
coachEntriesRouter.get("/clients/:clientId/entries", coachNutritionController.list);
coachEntriesRouter.post("/clients/:clientId/entries", photos, validate(createEntrySchema), coachNutritionController.create);
coachEntriesRouter.get("/clients/:clientId/entries/:id", coachNutritionController.get);
coachEntriesRouter.patch("/clients/:clientId/entries/:id", photos, coachNutritionController.update);
coachEntriesRouter.delete("/clients/:clientId/entries/:id", coachNutritionController.remove);
