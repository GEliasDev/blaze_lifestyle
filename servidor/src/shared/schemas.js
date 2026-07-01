import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["client", "coach"]),
  coachCode: z.string().min(1).optional(),
});

export const linkCoachSchema = z.object({ coachCode: z.string().min(1) });

