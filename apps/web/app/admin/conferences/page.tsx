import type { Metadata } from "next";
import { Suspense } from "react";
import { ConferencesView } from "@/components/admin/views/conferences";

// Access is checked in the browser by AdminShell (see app/admin/layout.tsx).
export const instant = false;

export const metadata: Metadata = { title: "Conferences" };

export default function Page() {
  return (
    <Suspense>
      <ConferencesView />
    </Suspense>
  );
}
