import { z } from "zod";

export { loginSchema, registerSchema } from "@blaze/shared";

export const refreshSchema = z.object({ refreshToken: z.string().min(1) });
