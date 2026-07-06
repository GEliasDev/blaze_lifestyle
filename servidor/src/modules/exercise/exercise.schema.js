import { z } from "zod";
import { TAG_COLOR_PALETTE } from "../../shared/index.js";

export const MAX_PHOTOS = 5;

// Multipart form fields arrive as a single string when only one "tagIds" field
// was sent, and as an array only when 2+ were sent (multer/busboy behavior) —
// this normalizes both shapes to an array before validating.
const toArray = (v) => (v === undefined ? [] : Array.isArray(v) ? v : [v]);
const tagIdsSchema = z.preprocess(toArray, z.array(z.string().uuid()).min(1));

export const createEntrySchema = z.object({
  tagIds: tagIdsSchema,
  exercisedAt: z.string().datetime().optional(),
  description: z.string().min(1),
  biofeedback: z.string().optional(),
});

// The edit form is multipart (photos can be added/removed), so booleans/arrays
// arrive as strings — parsed inside the service, not via the validate middleware.
export const editEntrySchema = z.object({
  tagIds: tagIdsSchema.optional(),
  exercisedAt: z.string().datetime().optional(),
  description: z.string().min(1).optional(),
  biofeedback: z.string().optional(),
});

export const listQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export const createTagSchema = z.object({
  name: z.string().min(1),
  color: z.enum(TAG_COLOR_PALETTE),
});
