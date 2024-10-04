import { z } from "zod";

const envVariables = z.object({
  CONVEX_SITE_URL: z.string().url(),
  LOOPS_FORM_ID: z.string().min(1),
  POLAR_ACCESS_TOKEN: z.string().min(1),
  POLAR_ORGANIZATION_ID: z.string().min(1),
  POLAR_WEBHOOK_SECRET: z.string().min(1),
  RESEND_API_KEY: z.string().min(1),
  RESEND_SENDER_EMAIL_AUTH: z.string().email(),
  SITE_URL: z.string().url(),
});

const env = envVariables.parse({
  ...process.env,
  // Alias for platform specific deployment urls, update as needed
  SITE_URL: process.env.VERCEL_URL || process.env.SITE_URL,
});

export default env;
