import { z } from "zod";

export { loginSchema, registerSchema } from "../../shared/index.js";

export const refreshSchema = z.object({ refreshToken: z.string().min(1) });
