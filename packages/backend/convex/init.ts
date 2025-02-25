import { internalAction } from "./_generated/server";
import { polar } from "./subscriptions";

export default internalAction(async (ctx) => {
  /**
   * Polar Products.
   */
  const products = await polar.sdk.products.list({
    isArchived: false,
  });
  if (products?.result?.items?.length) {
    console.info("🏃‍♂️ Skipping Polar products creation and seeding.");
    return;
  }
  // Create Polar products, the Convex Polar component will sync them
  // back to the database via webhook.
  await polar.sdk.products.create({
    name: "Pro",
    description: "All the things for one low monthly price.",
    recurringInterval: "month",
    prices: [
      {
        priceAmount: 2000,
        amountType: "fixed",
      },
    ],
  });
  await polar.sdk.products.create({
    name: "Pro",
    description: "All the things for one low yearly price.",
    recurringInterval: "year",
    prices: [
      {
        priceAmount: 20000,
        amountType: "fixed",
      },
    ],
  });

  console.info("📦 Polar Products have been successfully created.");
});
