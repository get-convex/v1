import type { Doc } from "@v1/backend/convex/_generated/dataModel";

export type User = Doc<"users"> & {
  avatarUrl?: string;
};
