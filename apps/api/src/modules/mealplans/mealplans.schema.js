import { z } from "zod";

const CATEGORY = z.enum(["Breakfast", "AM Snack", "Lunch", "PM Snack", "Dinner", "Supplement"]);

export const createPlanSchema = z.object({
  name: z.string().min(1),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const planItemSchema = z.object({
  category: CATEGORY,
  title: z.string().min(1),
  notes: z.string().optional(),
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  specificDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
}).refine(
  (d) => (d.dayOfWeek === undefined) !== (d.specificDate === undefined),
  { message: "Provide exactly one of dayOfWeek or specificDate" },
);

export const patchItemSchema = z.object({
  category: CATEGORY.optional(),
  title: z.string().min(1).optional(),
  notes: z.string().optional(),
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  specificDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
}).refine(
  (d) => !(d.dayOfWeek !== undefined && d.specificDate !== undefined),
  { message: "Provide at most one of dayOfWeek or specificDate" },
);
