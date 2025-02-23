import { query } from "./_generated/server";
import { polar } from "./polar";

// Export the API functions

export const {
  changeCurrentSubscription,
  cancelCurrentSubscription,
  getProducts,
} = polar.api();

export const { generateCheckoutLink, generateCustomerPortalUrl } =
  polar.checkoutApi();

// Dummy function to force Convex to generate types when no
// functions are defined in the file. You can drop this if
// you have functions defined in the file.
export const forceTypeGeneration = query({
  args: {},
  handler: async (ctx) => {
    return "hello world";
  },
});
