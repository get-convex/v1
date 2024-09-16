import { fetchQuery } from "convex/nextjs";
import { api } from "@v1/backend/convex/_generated/api";
import { getI18n } from "@/locales/server";
import { SignOut } from "@/components/sign-out";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";

export const metadata = {
  title: "Home",
};

export default async function Page() {
  const user = await fetchQuery(api.user.getUser, {}, { token: convexAuthNextjsToken() });
  const t = await getI18n();
  console.log('user', user);

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center">
      <div className="flex flex-col items-center justify-center gap-4">
        <p>{t("welcome", { name: user?.email })}</p>
        <SignOut />
      </div>
    </div>
  );
}
