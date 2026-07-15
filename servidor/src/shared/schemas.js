import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

// Coaches no longer self-register through the public form (the client only
// ever sends role: "client" now) — "coach" stays a valid value here so
// creating one programmatically is still possible, just not exposed in the UI.
export const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["client", "coach"]),
  coachCode: z.string().min(1).optional(),
}).refine((data) => data.role !== "client" || !!data.coachCode, {
  message: "Coach code is required",
  path: ["coachCode"],
});

export const linkCoachSchema = z.object({ coachCode: z.string().min(1) });

