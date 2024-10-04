import { v } from "convex/values";
import { action } from "./_generated/server";
import { env } from "./env";

export const subscribe = action({
  args: {
    email: v.string(),
    userGroup: v.string(),
  },
  handler: async (ctx, args) => {
    const res = await fetch(
      `https://app.loops.so/api/newsletter-form/${env.LOOPS_FORM_ID}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: args.email,
          userGroup: args.userGroup,
        }),
      },
    );

    const json = await res.json();

    return json;
  },
});
