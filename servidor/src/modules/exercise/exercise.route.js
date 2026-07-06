import { Router } from "express";
import multer from "multer";
import { authGuard, roleGuard } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { createEntrySchema, MAX_PHOTOS } from "./exercise.schema.js";
import { exerciseController, coachExerciseController, tagsController } from "./exercise.controller.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const photos = upload.array("photos", MAX_PHOTOS);

export const clientExerciseRouter = Router(); // mounted at /api/me
clientExerciseRouter.use(authGuard, roleGuard("client"));
clientExerciseRouter.get("/exercise-entries", exerciseController.list);
clientExerciseRouter.post("/exercise-entries", photos, validate(createEntrySchema), exerciseController.create);
clientExerciseRouter.get("/exercise-entries/:id", exerciseController.get);
clientExerciseRouter.patch("/exercise-entries/:id", photos, exerciseController.update);
clientExerciseRouter.delete("/exercise-entries/:id", exerciseController.remove);
clientExerciseRouter.get("/exercise-stats", exerciseController.stats);

// Coach acting on a specific client's entries: mounted at /api/coach — read-only (no create/edit/delete).
export const coachExerciseRouter = Router();
coachExerciseRouter.use(authGuard, roleGuard("coach"));
coachExerciseRouter.get("/clients/:clientId/exercise-entries", coachExerciseController.list);
coachExerciseRouter.get("/clients/:clientId/exercise-entries/:id", coachExerciseController.get);
coachExerciseRouter.get("/clients/:clientId/exercise-stats", coachExerciseController.stats);

// Global tags (not client-scoped): mounted at /api/exercise-tags.
export const tagsRouter = Router();
tagsRouter.use(authGuard);
tagsRouter.get("/", tagsController.list);
tagsRouter.post("/", roleGuard("coach"), tagsController.create);
tagsRouter.delete("/:id", roleGuard("coach"), tagsController.remove);
