import type { Metadata } from "next";
import { Suspense } from "react";
import { SettingsView } from "@/components/dashboard/views/settings";

export const metadata: Metadata = { title: "Settings & Security" };

export default function Page() {
  return (
    <Suspense>
      <SettingsView />
    </Suspense>
  );
}
