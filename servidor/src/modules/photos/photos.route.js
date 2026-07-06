import { Router } from "express";
import { authGuard } from "../../middleware/auth.js";
import { nutritionController } from "../nutrition/nutrition.controller.js";
import { exerciseController } from "../exercise/exercise.controller.js";

// Key format is "<prefix>/<file>". Nutrition uses "meals"/"thumbs"; Exercise
// uses "exercise"/"exercise-thumbs" — dispatch to the matching module's photo
// handler, which knows which photo table (and ownership rule) to check.
export const photosRouter = Router();
photosRouter.use(authGuard);
photosRouter.get("/:prefix/:file", (req, res, next) => {
  const isExercise = req.params.prefix === "exercise" || req.params.prefix === "exercise-thumbs";
  return (isExercise ? exerciseController : nutritionController).photo(req, res, next);
});
