import { z } from "zod";

const CATEGORY = z.enum(["Breakfast", "AM Snack", "Lunch", "PM Snack", "Dinner", "Supplement"]);

// Multipart fields arrive as strings; coerce booleans.
export const createEntrySchema = z.object({
  category: CATEGORY,
  planItemId: z.string().uuid().optional(),
  description: z.string().optional(),
  eatenAt: z.string().min(1),
  hasSymptoms: z
    .union([z.literal("true"), z.literal("false"), z.boolean()])
    .transform((v) => v === true || v === "true")
    .optional(),
  symptomDescription: z.string().optional(),
  clientCompliance: z.enum(["yes", "no", "na"]).optional(),
});

export const updateEntrySchema = createEntrySchema.partial();
