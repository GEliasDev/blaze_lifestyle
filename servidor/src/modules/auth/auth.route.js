import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { loginSchema, registerSchema, refreshSchema } from "./auth.schema.js";
import { authController } from "./auth.controller.js";

export const authRouter = Router();
authRouter.post("/login", validate(loginSchema), authController.login);
authRouter.post("/register", validate(registerSchema), authController.register);
authRouter.post("/refresh", validate(refreshSchema), authController.refresh);
