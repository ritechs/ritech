import type { Metadata } from "next";
import { Suspense } from "react";
import { ProfileView } from "@/components/dashboard/views/profile";

export const metadata: Metadata = { title: "Scholar ID" };

export default function Page() {
  return (
    <Suspense>
      <ProfileView countries={[]} section="scholar" />
    </Suspense>
  );
}
