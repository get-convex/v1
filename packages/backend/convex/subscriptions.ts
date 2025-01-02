import { getAuthUserId } from "@convex-dev/auth/server";
import { Polar } from "@polar-sh/sdk";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import {
  action,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { env } from "./env";
import schema from "./schema";

const createCheckout = async ({
  customerEmail,
  productPriceId,
  successUrl
}: {
  customerEmail: string;
  productPriceId: string;
  successUrl: string;
}) => {
  const polar = new Polar({
    server: "sandbox",
    accessToken: env.POLAR_ACCESS_TOKEN,
  });
  const result = await polar.checkouts.create({
    productPriceId,
    successUrl,
    customerEmail
  });
  return result;
};

export const getPlanByKey = internalQuery({
  args: {
    key: schema.tables.plans.validator.fields.key,
  },
  handler: async (ctx, args) => {
    return ctx.db
      .query("plans")
      .withIndex("key", (q) => q.eq("key", args.key))
      .unique();
  },
});

export const getOnboardingCheckoutUrl = action({
  handler: async (ctx) => {
    const user = await ctx.runQuery(api.users.getUser);
    if (!user) {
      throw new Error("User not found");
    }
    const product = await ctx.runQuery(internal.subscriptions.getPlanByKey, {
      key: "free",
    });
    const price = product?.prices.month?.usd;
    if (!price) {
      throw new Error("Price not found");
    }
    if (!user.email) {
      throw new Error("User email not found");
    }
    const checkout = await createCheckout({
      customerEmail: user.email,
      productPriceId: price.polarId,
      successUrl: `${env.SITE_URL}/settings/billing`,
    });
    return checkout.url;
  },
});

export const getProOnboardingCheckoutUrl = action({
  args: {
    interval: schema.tables.subscriptions.validator.fields.interval,
  },
  handler: async (ctx, args) => {
    const user = await ctx.runQuery(api.users.getUser);
    if (!user) {
      throw new Error("User not found");
    }
    const product = await ctx.runQuery(internal.subscriptions.getPlanByKey, {
      key: "pro",
    });
    const price =
      args.interval === "month"
        ? product?.prices.month?.usd
        : product?.prices.year?.usd;
    if (!price) {
      throw new Error("Price not found");
    }
    if (!user.email) {
      throw new Error("User email not found");
    }
    const checkout = await createCheckout({
      customerEmail: user.email,
      productPriceId: price.polarId,
      successUrl: `${env.SITE_URL}/settings/billing`
    });
    return checkout.url;
  },
});

export const listPlans = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not found");
    }
    const plans = await ctx.db.query("plans").collect();
    return plans.sort((a, b) => a.key.localeCompare(b.key));
  },
});

export const getPolarEventUser = internalQuery({
  args: {
    polarId: v.optional(v.string()),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const userById = args.polarId
      ? await ctx.db
          .query("users")
          .withIndex("polarId", (q) => q.eq("polarId", args.polarId))
          .unique()
      : undefined;
    const user =
      userById ||
      (await ctx.db
        .query("users")
        .withIndex("email", (q) => q.eq("email", args.email))
        .unique());
    if (!user) {
      throw new Error("User not found");
    }
    if (user.polarId) {
      throw new Error(`User ${user.email} already has a Polar ID`);
    }
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("userId", (q) => q.eq("userId", user._id))
      .unique();
    if (!subscription) {
      return user;
    }
    const plan = await ctx.db.get(subscription.planId);
    if (!plan) {
      throw new Error("Plan not found");
    }
    return {
      ...user,
      subscription,
      plan,
    };
  },
});

export const replaceSubscription = internalMutation({
  args: {
    userId: v.id("users"),
    subscriptionPolarId: v.string(),
    input: v.object({
      currency: schema.tables.subscriptions.validator.fields.currency,
      productId: v.string(),
      priceId: v.string(),
      interval: schema.tables.subscriptions.validator.fields.interval,
      status: v.string(),
      currentPeriodStart: v.number(),
      currentPeriodEnd: v.optional(v.number()),
      cancelAtPeriodEnd: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("userId", (q) => q.eq("userId", args.userId))
      .unique();
    if (subscription) {
      await ctx.db.delete(subscription._id);
    }
    const plan = await ctx.db
      .query("plans")
      .withIndex("polarProductId", (q) =>
        q.eq("polarProductId", args.input.productId),
      )
      .unique();
    if (!plan) {
      throw new Error("Plan not found");
    }
    await ctx.db.insert("subscriptions", {
      userId: args.userId,
      planId: plan._id,
      polarId: args.subscriptionPolarId,
      polarPriceId: args.input.priceId,
      interval: args.input.interval,
      status: args.input.status,
      currency: args.input.currency,
      currentPeriodStart: args.input.currentPeriodStart,
      currentPeriodEnd: args.input.currentPeriodEnd,
      cancelAtPeriodEnd: args.input.cancelAtPeriodEnd,
    });
    const user = await ctx.db.get(args.userId);
    if (!user?.polarSubscriptionPendingId) {
      return;
    }
    await ctx.scheduler.cancel(user.polarSubscriptionPendingId);
    await ctx.db.patch(args.userId, {
      polarSubscriptionPendingId: undefined,
    });
  },
});

export const setSubscriptionPending = mutation({
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not found");
    }
    const scheduledFunctionId = await ctx.scheduler.runAfter(
      1000 * 120,
      internal.subscriptions.unsetSubscriptionPending,
      { userId },
    );
    await ctx.db.patch(userId, {
      polarSubscriptionPendingId: scheduledFunctionId,
    });
  },
});

export const unsetSubscriptionPending = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      polarSubscriptionPendingId: undefined,
    });
  },
});
