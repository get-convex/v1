import { v } from "convex/values";
import OpenAI from "openai";
import { mutation } from "./_generated/server";

export const connectToOpenAI = mutation({
  args: { apiKey: v.string() },
  handler: async (ctx, args) => {
    const { apiKey } = args;
    const userId = ctx.auth.userId;

    if (!userId) {
      return { success: false, error: "User not authenticated" };
    }

    // Validate the API key
    try {
      const openai = new OpenAI({ apiKey });
      await openai.chat.completions.create({
        messages: [{ role: "user", content: "Test" }],
        model: "gpt-3.5-turbo",
      });

      // If the above doesn't throw, the API key is valid
      // Update the user's record with the API key
      await ctx.db.patch(userId, { openAIApiKey: apiKey });

      return { success: true };
    } catch (error) {
      console.error("Error connecting to OpenAI:", error);
      return { success: false, error: "Invalid API key" };
    }
  },
});
