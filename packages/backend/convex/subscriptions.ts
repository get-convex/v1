import { getAuthUserId } from "@convex-dev/auth/server";
import { Polar } from "@polar-sh/sdk";
import { v } from "convex/values";
import { action, query } from "./_generated/server";

export const createCheckout = action({
  args: {
    productPriceId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not found");
    }
    const polar = new Polar({
      server: "sandbox",
      accessToken: process.env.POLAR_ACCESS_TOKEN ?? "",
    });
    const result = await polar.checkouts.create({
      productPriceId: args.productPriceId,
      successUrl: "https://localhost:3000/settings/billing",
    });
    return result;
  },
});

export const listPlans = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not found");
    }
    return ctx.db.query("plans").collect();
  },
});
