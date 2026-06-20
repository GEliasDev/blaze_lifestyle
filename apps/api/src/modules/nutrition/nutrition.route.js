import { Router } from "express";
import multer from "multer";
import { authGuard, roleGuard } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { createEntrySchema } from "./nutrition.schema.js";
import { nutritionController } from "./nutrition.controller.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

export const clientEntriesRouter = Router(); // mounted at /api/me
clientEntriesRouter.use(authGuard, roleGuard("client"));
clientEntriesRouter.get("/entries", nutritionController.list);
clientEntriesRouter.post("/entries", upload.array("photos", 6), validate(createEntrySchema), nutritionController.create);
clientEntriesRouter.get("/entries/:id", nutritionController.get);
clientEntriesRouter.delete("/entries/:id", nutritionController.remove);

// Photo proxy (both roles): mounted at /api/photos, key is "<prefix>/<file>"
export const photosRouter = Router();
photosRouter.use(authGuard);
photosRouter.get("/:prefix/:file", nutritionController.photo);
