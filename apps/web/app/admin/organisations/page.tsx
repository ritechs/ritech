import type { Metadata } from "next";
import { Suspense } from "react";
import { OrganisationsView } from "@/components/admin/views/library";

// Access is checked in the browser by AdminShell (see app/admin/layout.tsx).
export const instant = false;

export const metadata: Metadata = { title: "Sponsors & Partners" };

export default function Page() {
  return (
    <Suspense>
      <OrganisationsView />
    </Suspense>
  );
}
