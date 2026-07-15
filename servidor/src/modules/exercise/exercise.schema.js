import { z } from "zod";
import { TAG_COLOR_PALETTE, EXERCISE_FEELINGS } from "../../shared/index.js";

export const MAX_PHOTOS = 5;

// "" is accepted alongside the real enum values so the edit form can send an
// empty string to clear a previously-picked feeling (same convention as
// biofeedback: always send the field, "" means "no value").
const feelingSchema = z.union([z.enum(EXERCISE_FEELINGS), z.literal("")]).optional();

// An entry takes exactly one tag (the UI is single-select) — the field is
// still named "tagIds" and sent/stored as a one-element array so the
// underlying many-to-many join table (exercise_entry_tags) doesn't need to
// change if multi-tag entries come back later. Multipart form fields arrive
// as a single string when only one "tagIds" field was sent (always true now,
// but also normalizes the case of a stray duplicate field) — this wraps that
// into an array before validating.
const toArray = (v) => (v === undefined ? [] : Array.isArray(v) ? v : [v]);
const tagIdsSchema = z.preprocess(toArray, z.array(z.string().uuid()).length(1));

// Multipart booleans arrive as the strings "true"/"false" — same convention
// as Nutrition's hasSymptoms (see nutrition.schema.js).
const hasAlertSchema = z.union([z.boolean(), z.enum(["true", "false"]).transform((v) => v === "true")]).optional();

export const createEntrySchema = z.object({
  tagIds: tagIdsSchema,
  exercisedAt: z.string().datetime().optional(),
  title: z.string().min(1),
  description: z.string().min(1),
  biofeedback: z.string().optional(),
  feeling: feelingSchema,
  hasAlert: hasAlertSchema,
  alertNote: z.string().optional(),
});

// The edit form is multipart (photos can be added/removed), so booleans/arrays
// arrive as strings — parsed inside the service, not via the validate middleware.
export const editEntrySchema = z.object({
  tagIds: tagIdsSchema.optional(),
  exercisedAt: z.string().datetime().optional(),
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  biofeedback: z.string().optional(),
  feeling: feelingSchema,
  hasAlert: hasAlertSchema,
  alertNote: z.string().optional(),
});

export const listQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

// timeZone is an IANA name (e.g. "America/Bogota") the client reads from
// Intl.DateTimeFormat().resolvedOptions().timeZone — stats() buckets days
// in this zone instead of the server's, so "today"/"this week" match what
// the requesting user actually sees on their calendar.
export const statsQuerySchema = z.object({
  timeZone: z.string().min(1).optional(),
  weekStartsOn: z.coerce.number().int().min(0).max(6).optional(),
  // Which year the weeklyChart covers — clamped server-side to
  // [registeredYear, currentYear] regardless of what's sent (see
  // exercise.service.js stats()).
  year: z.coerce.number().int().min(2000).max(2100).optional(),
});

export const createTagSchema = z.object({
  name: z.string().min(1),
  color: z.enum(TAG_COLOR_PALETTE),
});

export const updateTagSchema = z.object({
  name: z.string().min(1).optional(),
  color: z.enum(TAG_COLOR_PALETTE).optional(),
});
