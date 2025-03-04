import { asyncMap } from "convex-helpers";
import { internal } from "./_generated/api";
import { internalAction, internalMutation } from "./_generated/server";
import schema, { INTERVALS, type PlanKey, PLANS } from "./schema";
import { polar } from "./subscriptions";

const seedProducts = [
  {
    key: PLANS.FREE,
    name: "Free",
    description: "Some of the things, free forever.",
    recurringInterval: INTERVALS.MONTH,
    prices: [
      {
        priceAmount: 0,
        amountType: "free",
      },
    ],
  },
  {
    key: PLANS.PRO,
    name: "Pro",
    description: "All the things for one low monthly price.",
    recurringInterval: INTERVALS.MONTH,
    prices: [
      {
        priceAmount: 599,
        amountType: "fixed",
      },
    ],
  },
  {
    key: PLANS.PRO_YEARLY,
    name: "Pro Yearly",
    description: "All the things for one low yearly price.",
    recurringInterval: INTERVALS.YEAR,
    prices: [
      {
        priceAmount: 5990,
        amountType: "fixed",
      },
    ],
  },
] as const;

export const insertSeedPlan = internalMutation({
  args: schema.tables.plans.validator,
  handler: async (ctx, args) => {
    await ctx.db.insert("plans", {
      polarProductId: args.polarProductId,
      key: args.key,
      name: args.name,
      description: args.description,
      recurringInterval: args.recurringInterval,
      prices: args.prices,
    });
  },
});

export default internalAction(async (ctx) => {
  await asyncMap(seedProducts, async (product) => {
    // Create Polar product.
    const polarProduct = await polar.sdk.products.create({
      name: product.name,
      description: product.description,
      recurringInterval: product.recurringInterval,
      prices: [
        {
          priceAmount: product.prices[0].priceAmount,
          amountType: product.prices[0].amountType,
        }
      ],
    });

    await ctx.runMutation(internal.init.insertSeedPlan, {
      polarProductId: polarProduct.id,
      key: product.key as PlanKey,
      name: product.name,
      description: product.description,
      recurringInterval: product.recurringInterval,
      prices: {
        priceAmount: product.prices[0].priceAmount,
        amountType: product.prices[0].amountType,
      }
    });
  });

  console.info("📦 Polar Products have been successfully created.");
});
