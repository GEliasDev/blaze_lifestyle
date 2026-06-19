import { z } from "zod";
export { acceptInviteSchema } from "@blaze/shared";
export const createInviteSchema = z.object({ email: z.string().email() });
