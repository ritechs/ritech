import type { Metadata } from "next";
import { Suspense } from "react";
import { SecurityView } from "@/components/admin/views/security";

// Access is checked in the browser by AdminShell (see app/admin/layout.tsx).
export const instant = false;

export const metadata: Metadata = { title: "Security" };

export default function Page() {
  return (
    <Suspense>
      <SecurityView />
    </Suspense>
  );
}
