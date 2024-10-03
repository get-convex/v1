import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { api } from "@v1/backend/convex/_generated/api";
import { fetchQuery, preloadQuery } from "convex/nextjs";
import { redirect } from "next/navigation";
import { Navigation } from "./_components/navigation";

export default async function Layout({
  children,
}: { children: React.ReactNode }) {
  const user = await fetchQuery(
    api.users.getUser,
    {},
    { token: convexAuthNextjsToken() },
  );
  if (!user?.username || !user?.subscription) {
    return redirect("/onboarding");
  }
  const preloadedUser = await preloadQuery(
    api.users.getUser,
    {},
    { token: convexAuthNextjsToken() },
  );
  return (
    <div className="flex min-h-[100vh] w-full flex-col bg-secondary dark:bg-black">
      <Navigation preloadedUser={preloadedUser} />
      {children}
    </div>
  );
}
