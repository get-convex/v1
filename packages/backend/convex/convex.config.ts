import polar from "@convex-dev/polar/convex.config";
import { defineApp } from "convex/server";

const app = defineApp();
app.use(polar);

export default app;
