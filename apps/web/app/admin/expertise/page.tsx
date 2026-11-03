import type { Metadata } from "next";
import { Suspense } from "react";
import { ExpertiseView } from "@/components/admin/views/library";

// Access is checked in the browser by AdminShell (see app/admin/layout.tsx).
export const instant = false;

export const metadata: Metadata = { title: "Expertise Topics" };

export default function Page() {
  return (
    <Suspense>
      <ExpertiseView />
    </Suspense>
  );
}
