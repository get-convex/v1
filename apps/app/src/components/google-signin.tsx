"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { Button } from "@v1/ui/button";

export function GoogleSignin() {
  const { signIn } = useAuthActions();

  return (
    <Button onClick={() => signIn("google")} variant="outline" className="font-mono">
      Sign in with Google
    </Button>
  );
}
