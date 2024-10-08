import { CalEmbed } from "@/components/cal-embed";
import { env } from "@/env";

export const metadata = {
  title: "Talk to us",
};

export default function Page() {
  return (
    <div className="flex flex-col items-center justify-center h-screen w-full">
      <div className="mt-24 w-full">
        <CalEmbed calLink={env.NEXT_PUBLIC_CAL_LINK || ""} />
      </div>
    </div>
  );
}
