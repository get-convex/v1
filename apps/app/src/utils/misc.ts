import { CURRENCIES } from "@v1/backend/convex/schema";

/**
 * Locales.
 */
export function getLocaleCurrency() {
  return navigator.languages.includes("en-US")
    ? CURRENCIES.USD
    : // Only support USD for now due to Polar limitations.
      CURRENCIES.USD;
}
