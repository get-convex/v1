"use client";

import { api } from "@v1/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";

export default function UsernameRedirect() {
  const user = useQuery(api.users.getUser);
  const router = useRouter();
  if (!user) {
    return null;
  }
  if (!user.username) {
    router.push("/onboarding");
  }
  return null;
}
