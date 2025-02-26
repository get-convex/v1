import { Polar } from "@convex-dev/polar";
import { api, components } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

export const polar = new Polar(components.polar, {
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
  listAllProducts,
} = polar.api();

export const { generateCheckoutLink, generateCustomerPortalUrl } =
  polar.checkoutApi();
