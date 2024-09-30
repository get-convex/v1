import { SignOut } from "@/components/sign-out";
import { getI18n } from "@/locales/server";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { api } from "@v1/backend/convex/_generated/api";
import { fetchQuery } from "convex/nextjs";

export const metadata = {
  title: "Home",
};

export default async function Page() {
  const user = await fetchQuery(
    api.users.getUser,
    {},
    { token: convexAuthNextjsToken() },
  );
  const t = await getI18n();
  console.log("user", user);

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center">
      <div className="flex flex-col items-center justify-center gap-4">
        <p>{t("welcome", { name: user?.email })}</p>
        <SignOut />
      </div>
    </div>
  );
}
