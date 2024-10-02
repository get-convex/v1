import { getAuthUserId } from "@convex-dev/auth/server";
import { Polar } from "@polar-sh/sdk";
import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";

const listProducts = async () => {
  const polar = new Polar({
    accessToken: process.env.POLAR_ACCESS_TOKEN ?? "",
  });
  return await polar.products.list({
    organizationId: process.env.POLAR_ORGANIZATION_ID!,
  });
};

export const getFreeProduct = async () => {
  const products = await listProducts();
  for await (const page of products) {
    const freeProduct = page.result.items.find((item) =>
      item.prices.some((price) => price.amountType === "free"),
    );
    if (freeProduct) {
      return freeProduct;
    }
  }
};

export const getProProduct = async () => {
  const products = await listProducts();
  for await (const page of products) {
    const proProduct = page.result.items.find((item) =>
      item.prices.some(
        (price) => price.amountType !== "free" && price.type === "recurring",
      ),
    );
  }
};

export const createDefaultSubscription = internalAction({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const freeProduct = await getFreeProduct();
    const price = freeProduct?.prices.find(
      (price) => price.amountType === "free",
    );
    if (!price) {
      throw new Error("Free product not found");
    }
    await ctx.db.patch(args.userId, {
      subscriptionId: freeProduct.id,
    });
  },
});

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
      accessToken: process.env.POLAR_ACCESS_TOKEN ?? "",
    });
    const result = await polar.checkouts.create({
      productPriceId: args.productPriceId,
      successUrl: "https://localhost:3000/settings/billing",
    });
    return result;
  },
});
