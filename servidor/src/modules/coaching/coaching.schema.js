import { z } from "zod";

// A coach only ever moves a client to "approved" or "rejected" — "pending" is
// solely the state a new link starts in, never something to set back to.
export const setClientStatusSchema = z.object({
  status: z.enum(["approved", "rejected"]),
});

// "" clears the nickname back to the client's real name.
export const setNicknameSchema = z.object({
  nickname: z.string().max(100),
});
