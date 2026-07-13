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
clientExerciseRouter.get("/exercise-tags/used", exerciseController.usedTags);

// Coach acting on a specific client's entries: mounted at /api/coach — same
// full access as the client (create/edit/delete), not read-only.
export const coachExerciseRouter = Router();
coachExerciseRouter.use(authGuard, roleGuard("coach"));
coachExerciseRouter.get("/clients/:clientId/exercise-entries", coachExerciseController.list);
coachExerciseRouter.post("/clients/:clientId/exercise-entries", photos, validate(createEntrySchema), coachExerciseController.create);
coachExerciseRouter.get("/clients/:clientId/exercise-entries/:id", coachExerciseController.get);
coachExerciseRouter.patch("/clients/:clientId/exercise-entries/:id", photos, coachExerciseController.update);
coachExerciseRouter.delete("/clients/:clientId/exercise-entries/:id", coachExerciseController.remove);
coachExerciseRouter.get("/clients/:clientId/exercise-stats", coachExerciseController.stats);
coachExerciseRouter.get("/clients/:clientId/exercise-tags/used", coachExerciseController.usedTags);

// Global tags (not client-scoped): mounted at /api/exercise-tags.
export const tagsRouter = Router();
tagsRouter.use(authGuard);
tagsRouter.get("/", tagsController.list);
tagsRouter.post("/", roleGuard("coach"), tagsController.create);
tagsRouter.patch("/:id", roleGuard("coach"), tagsController.update);
tagsRouter.delete("/:id", roleGuard("coach"), tagsController.remove);
