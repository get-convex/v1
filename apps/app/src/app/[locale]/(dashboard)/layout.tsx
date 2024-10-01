import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { api } from "@v1/backend/convex/_generated/api";
import { preloadQuery } from "convex/nextjs";
import { Navigation } from "./_components/navigation";
import UsernameRedirect from "./username-redirect";

export default async function Layout({
  children,
}: { children: React.ReactNode }) {
  const preloadedUser = await preloadQuery(
    api.users.getUser,
    {},
    { token: convexAuthNextjsToken() },
  );
  return (
    <div className="flex min-h-[100vh] w-full flex-col bg-secondary dark:bg-black">
      <UsernameRedirect />
      <Navigation preloadedUser={preloadedUser} />
      {children}
    </div>
  );
}
