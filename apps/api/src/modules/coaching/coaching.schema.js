import { z } from "zod";
export const commentSchema = z.object({ body: z.string().min(1) });
export const complianceSchema = z.object({ coachCompliance: z.enum(["yes", "no"]) });
