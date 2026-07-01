import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { authLimiter } from "../../middleware/rateLimit.js";
import { loginSchema, registerSchema, refreshSchema } from "./auth.schema.js";
import { authController } from "./auth.controller.js";

export const authRouter = Router();
authRouter.post("/login", authLimiter, validate(loginSchema), authController.login);
authRouter.post("/register", authLimiter, validate(registerSchema), authController.register);
authRouter.post("/refresh", validate(refreshSchema), authController.refresh);
