import { Polar } from "@polar-sh/sdk";
import { asyncMap } from "convex-helpers";
import { internal } from "./_generated/api";
import { internalAction, internalMutation } from "./_generated/server";
import { env } from "./env";
import schema, { CURRENCIES, INTERVALS, type PlanKey, PLANS } from "./schema";

const seedProducts = [
  {
    key: PLANS.FREE,
    name: "Free",
    description: "Some of the things, free forever.",
    amountType: "free",
    prices: {
      [INTERVALS.MONTH]: {
        [CURRENCIES.USD]: 0,
      },
    },
  },
  {
    key: PLANS.PRO,
    name: "Pro",
    description: "All the things for one low monthly price.",
    amountType: "fixed",
    prices: {
      [INTERVALS.MONTH]: {
        [CURRENCIES.USD]: 2000,
      },
      [INTERVALS.YEAR]: {
        [CURRENCIES.USD]: 20000,
      },
    },
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
      prices: args.prices,
    });
  },
});

export default internalAction(async (ctx) => {
  /**
   * Stripe Products.
   */
  const polar = new Polar({
    server: "sandbox",
    accessToken: env.POLAR_ACCESS_TOKEN,
  });
  const products = await polar.products.list({
    organizationId: env.POLAR_ORGANIZATION_ID,
    isArchived: false,
  });
  if (products?.result?.items?.length) {
    console.info("🏃‍♂️ Skipping Polar products creation and seeding.");
    return;
  }

  await asyncMap(seedProducts, async (product) => {
    // Create Polar product.
    const polarProduct = await polar.products.create({
      organizationId: env.POLAR_ORGANIZATION_ID,
      name: product.name,
      description: product.description,
      prices: Object.entries(product.prices).map(([interval, amount]) => ({
        amountType: product.amountType,
        priceAmount: amount.usd,
        recurringInterval: interval,
      })),
    });
    const monthPrice = polarProduct.prices.find(
      (price) =>
        price.type === "recurring" &&
        price.recurringInterval === INTERVALS.MONTH,
    );
    const yearPrice = polarProduct.prices.find(
      (price) =>
        price.type === "recurring" &&
        price.recurringInterval === INTERVALS.YEAR,
    );

    await ctx.runMutation(internal.init.insertSeedPlan, {
      polarProductId: polarProduct.id,
      key: product.key as PlanKey,
      name: product.name,
      description: product.description,
      prices: {
        ...(!monthPrice
          ? {}
          : {
              month: {
                usd: {
                  polarId: monthPrice?.id,
                  amount:
                    monthPrice.amountType === "fixed"
                      ? monthPrice.priceAmount
                      : 0,
                },
              },
            }),
        ...(!yearPrice
          ? {}
          : {
              year: {
                usd: {
                  polarId: yearPrice?.id,
                  amount:
                    yearPrice.amountType === "fixed"
                      ? yearPrice.priceAmount
                      : 0,
                },
              },
            }),
      },
    });
  });

  console.info("📦 Polar Products have been successfully created.");
});
