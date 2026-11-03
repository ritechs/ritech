import type { Metadata } from "next";
import { Suspense } from "react";
import { ProfileView } from "@/components/dashboard/views/profile";

export const metadata: Metadata = { title: "Biography" };

export default function Page() {
  return (
    <Suspense>
      <ProfileView countries={[]} section="biography" />
    </Suspense>
  );
}
