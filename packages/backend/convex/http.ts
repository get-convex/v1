import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { polar } from "./subscriptions";

const http = httpRouter();

auth.addHttpRoutes(http);

// Register the webhook handler at /polar/events
// biome-ignore lint/suspicious/noExplicitAny: <explanation>
polar.registerRoutes(http as any);

export default http;
