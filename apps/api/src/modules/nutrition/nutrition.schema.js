import { z } from "zod";
import { MEAL_CATEGORIES, COMPLIANCE } from "@blaze/shared";

export const createEntrySchema = z.object({
  category: z.enum(MEAL_CATEGORIES),
  eatenAt: z.string().datetime().optional(),
  compliance: z.enum(COMPLIANCE).optional().default("na"),
  description: z.string().optional(),
});

// The edit form is multipart (photos can be added/removed), so booleans arrive
// as strings. Parsed inside the service, not via the validate middleware.
export const editEntrySchema = z.object({
  category: z.enum(MEAL_CATEGORIES).optional(),
  eatenAt: z.string().datetime().optional(),
  compliance: z.enum(COMPLIANCE).optional(),
  description: z.string().optional(),
  hasSymptoms: z.union([z.boolean(), z.enum(["true", "false"]).transform((v) => v === "true")]).optional(),
  symptomDescription: z.string().optional(),
});

export const MAX_PHOTOS = 3;
