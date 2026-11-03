import type { Metadata } from "next";
import { Suspense } from "react";
import { MembersView } from "@/components/admin/views/members";

// Access is checked in the browser by AdminShell (see app/admin/layout.tsx).
export const instant = false;

export const metadata: Metadata = { title: "Members" };

export default function Page() {
  return (
    <Suspense>
      <MembersView />
    </Suspense>
  );
}
