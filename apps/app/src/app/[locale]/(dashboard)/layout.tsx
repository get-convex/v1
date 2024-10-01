import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { api } from "@v1/backend/convex/_generated/api";
import { preloadQuery } from "convex/nextjs";
import { Navigation } from "./_components/navigation";

export default async function Layout({
  children,
}: { children: React.ReactNode }) {
  const user = await preloadQuery(
    api.users.getUser,
    {},
    { token: convexAuthNextjsToken() },
  );
  if (!user) {
    return null;
  }
  return (
    <div className="flex min-h-[100vh] w-full flex-col bg-secondary dark:bg-black">
      <Navigation preloadedUser={user} />
      {children}
    </div>
  );
}
