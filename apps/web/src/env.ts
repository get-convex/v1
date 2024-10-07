import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  client: {
    NEXT_PUBLIC_CONVEX_URL: z.string().url(),
    NEXT_PUBLIC_OPENPANEL_CLIENT_ID: z.optional(z.string().min(1)),
    NEXT_PUBLIC_APP_URL: z.optional(z.string().url()),
    NEXT_PUBLIC_CAL_LINK: z.optional(z.string().min(1)),
  },
  runtimeEnv: {
    NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL,
    NEXT_PUBLIC_OPENPANEL_CLIENT_ID:
      process.env.NEXT_PUBLIC_OPENPANEL_CLIENT_ID,
    NEXT_PUBLIC_CAL_LINK: process.env.NEXT_PUBLIC_CAL_LINK,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
  skipValidation: !!process.env.CI || !!process.env.SKIP_ENV_VALIDATION,
});
