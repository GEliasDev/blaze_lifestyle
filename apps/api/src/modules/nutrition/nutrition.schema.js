import { z } from "zod";

export const createEntrySchema = z.object({
  planItemId: z.string().uuid(),
  eatenAt: z.string().min(1).optional(),
  hasSymptoms: z
    .union([z.literal("true"), z.literal("false"), z.boolean()])
    .transform((v) => v === true || v === "true")
    .optional(),
  symptomDescription: z.string().optional(),
});
