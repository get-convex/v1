import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { z } from "zod";
import { type MutationCtx, mutation, query } from "./_generated/server";
import { auth } from "./auth";
import { currencyValidator } from "./schema";

export const getUser = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    console.log("userId", userId);
    if (!userId) {
      return;
    }
    const user = await ctx.db.get(userId);
    if (!user) {
      return;
    }
    return {
      ...user,
      name: user.username || user.name,
      avatarUrl: user.imageId
        ? await ctx.storage.getUrl(user.imageId)
        : undefined,
      subscription: {
        planKey: "fake-plan-key",
        planId: "fake-plan-id",
        cancelAtPeriodEnd: false,
        currentPeriodEnd: 5,
      },
      customerId: undefined,
    };
  },
});

const updateUsername = async (ctx: MutationCtx, username: string) => {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    return;
  }
  const schema = z.object({
    username: z.string({
      invalid_type_error: "Invalid Username",
    }),
  });
  const validatedFields = schema.safeParse({
    username,
  });

  if (!validatedFields.success) {
    throw new Error("Invalid username");
  }
  await ctx.db.patch(userId, { username });
};

const updateUsernameMutation = mutation({
  args: {
    username: v.string(),
  },
  handler: async (ctx, args) => {
    await updateUsername(ctx, args.username);
  },
});
export { updateUsernameMutation as updateUsername };

export const completeOnboarding = mutation({
  args: {
    username: v.string(),
    currency: currencyValidator,
  },
  handler: async (ctx, args) => {
    await updateUsername(ctx, args.username);
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not found");
    }
    return await ctx.storage.generateUploadUrl();
  },
});

export const updateUserImage = mutation({
  args: {
    imageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return;
    }
    ctx.db.patch(userId, { imageId: args.imageId });
  },
});

export const removeUserImage = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      return;
    }
    ctx.db.patch(userId, { imageId: undefined, image: undefined });
  },
});
