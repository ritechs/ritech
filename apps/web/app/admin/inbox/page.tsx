import type { Metadata } from "next";
import { Suspense } from "react";
import { InboxView } from "@/components/admin/views/inbox";

// Access is checked in the browser by AdminShell (see app/admin/layout.tsx).
export const instant = false;

export const metadata: Metadata = { title: "Inbox" };

export default function Page() {
  return (
    <Suspense>
      <InboxView />
    </Suspense>
  );
}
