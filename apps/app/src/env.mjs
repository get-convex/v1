import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  shared: {
    VERCEL_URL: z
      .string()
      .optional()
      .transform((v) => (v ? `https://${v}` : undefined)),
    PORT: z.coerce.number().default(3000),
  },
  server: {
    OPENPANEL_SECRET_KEY: z.string(),
    RESEND_API_KEY: z.string(),
  },
  client: {
    NEXT_PUBLIC_OPENPANEL_CLIENT_ID: z.string(),
  },
  runtimeEnv: {
    NEXT_PUBLIC_OPENPANEL_CLIENT_ID:
      process.env.NEXT_PUBLIC_OPENPANEL_CLIENT_ID,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    OPENPANEL_SECRET_KEY: process.env.OPENPANEL_SECRET_KEY,
    PORT: process.env.PORT,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    VERCEL_URL: process.env.VERCEL_URL,
  },
  skipValidation: !!process.env.CI || !!process.env.SKIP_ENV_VALIDATION,
});
