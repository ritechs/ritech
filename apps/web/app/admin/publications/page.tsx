import type { Metadata } from "next";
import { Suspense } from "react";
import { PublicationsView } from "@/components/admin/views/publications";

// Access is checked in the browser by AdminShell (see app/admin/layout.tsx).
export const instant = false;

export const metadata: Metadata = { title: "Publications" };

export default function Page() {
  return (
    <Suspense>
      <PublicationsView />
    </Suspense>
  );
}
