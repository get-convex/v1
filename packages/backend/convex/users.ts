import { query } from "./_generated/server";

export const getUser = query({
  handler: async (ctx) => {
    const userId = ctx.auth.userId;
    if (!userId) return null;
    return await ctx.db.get(userId);
  },
});
