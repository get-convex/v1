import { getAuthUserId } from "@convex-dev/auth/server";
import { query } from './_generated/server'

export const getUser = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    console.log('userId', userId);
    if (!userId) {
      return
    }
    return ctx.db.get(userId);
  },
});