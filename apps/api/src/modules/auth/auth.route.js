import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { loginSchema } from "./auth.schema.js";
import { authController } from "./auth.controller.js";

export const authRouter = Router();
authRouter.post("/login", validate(loginSchema), authController.login);
