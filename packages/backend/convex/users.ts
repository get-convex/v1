import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { z } from "zod";
import { api } from "./_generated/api";
import { type MutationCtx, action, mutation, query } from "./_generated/server";
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
    const subscription = user.subscriptionId
      ? await ctx.db.get(user.subscriptionId)
      : undefined;
    const plan = subscription?.planId
      ? await ctx.db.get(subscription.planId)
      : undefined;
    return {
      ...user,
      name: user.username || user.name,
      subscription,
      plan,
      avatarUrl: user.imageId
        ? await ctx.storage.getUrl(user.imageId)
        : undefined,
    };
  },
});

export const updateUsername = mutation({
  args: {
    username: v.string(),
  },
  handler: async (ctx, args) => {
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
      username: args.username,
    });

    if (!validatedFields.success) {
      throw new Error("Invalid username");
    }
    await ctx.db.patch(userId, { username: validatedFields.data.username });
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
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return;
    }
    ctx.db.patch(userId, { imageId: undefined, image: undefined });
  },
});
