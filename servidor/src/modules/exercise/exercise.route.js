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
// Each client manages their own private tag set — see exercise.service.js listTags.
clientExerciseRouter.get("/exercise-tags", tagsController.list);
clientExerciseRouter.post("/exercise-tags", tagsController.create);
clientExerciseRouter.patch("/exercise-tags/:id", tagsController.update);
clientExerciseRouter.delete("/exercise-tags/:id", tagsController.remove);

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
// Same full access as entries above — a coach can list/create/edit/delete
// tags for any of their own approved clients, not just their own "ME".
coachExerciseRouter.get("/clients/:clientId/exercise-tags", coachExerciseController.listTags);
coachExerciseRouter.post("/clients/:clientId/exercise-tags", coachExerciseController.createTag);
coachExerciseRouter.patch("/clients/:clientId/exercise-tags/:id", coachExerciseController.updateTag);
coachExerciseRouter.delete("/clients/:clientId/exercise-tags/:id", coachExerciseController.removeTag);
