import { z } from "zod";
import { APP_ENVIRONMENTS } from "../../shared/index.js";

export const setModuleFlagSchema = z.object({
  enabled: z.boolean(),
  environment: z.enum(APP_ENVIRONMENTS),
});
