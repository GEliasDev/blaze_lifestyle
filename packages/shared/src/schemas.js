import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const acceptInviteSchema = z.object({
  name: z.string().min(1),
  password: z.string().min(8),
});
