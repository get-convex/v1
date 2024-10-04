import { z } from "zod";

const envVariables = z.object({
  CONVEX_SITE_URL: z.string().url(),
  POLAR_ACCESS_TOKEN: z.string().min(1),
  POLAR_ORGANIZATION_ID: z.string().min(1),
  POLAR_WEBHOOK_SECRET: z.string().min(1),
  RESEND_API_KEY: z.string().min(1),
  RESEND_SENDER_EMAIL_AUTH: z.string().email(),
  SITE_URL: z.string().url(),

  // Uncomment for each service you set up
  // LOOPS_FORM_ID: z.string().min(1),
});

const env = envVariables.parse({
  CONVEX_SITE_URL: process.env.CONVEX_SITE_URL,
  POLAR_ACCESS_TOKEN: process.env.POLAR_ACCESS_TOKEN,
  POLAR_ORGANIZATION_ID: process.env.POLAR_ORGANIZATION_ID,
  POLAR_WEBHOOK_SECRET: process.env.POLAR_WEBHOOK_SECRET,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  RESEND_SENDER_EMAIL_AUTH: process.env.RESEND_SENDER_EMAIL_AUTH,

  // Alias for platform specific deployment urls, update as needed
  SITE_URL: process.env.SITE_URL,

  // Uncomment for each service you set up
  // LOOPS_FORM_ID: process.env.LOOPS_FORM_ID,
});

export default env;
