import { z } from "zod";

export const setModuleFlagSchema = z.object({
  enabled: z.boolean(),
});
