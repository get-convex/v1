import { Polar } from "@convex-dev/polar";
import { api, components } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { query } from "./_generated/server";

export const polar = new Polar(components.polar, {
  products: {
    // Map your product keys to Polar product IDs (you can also use env vars for this)
    proMonthly: "d078dc51-5c4c-4284-9b8b-512cfef8f6eb",
    proYearly: "0d669a2a-b83d-4441-9fd3-1fa1b3601e37",
  },
  // Provide a function the component can use to get the current user's ID and email
  getUserInfo: async (ctx): Promise<{ userId: Id<"users">; email: string }> => {
    const user = await ctx.runQuery(api.users.getUser);
    if (!user) {
      throw new Error("User not found");
    }
    if (!user.email) {
      throw new Error("User email is required");
    }
    return {
      userId: user._id,
      email: user.email,
    };
  },
});

// Export the API functions
export const {
  changeCurrentSubscription,
  cancelCurrentSubscription,
  getProducts,
} = polar.api();

export const { generateCheckoutLink, generateCustomerPortalUrl } =
  polar.checkoutApi();
