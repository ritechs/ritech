import type { Metadata } from "next";
import { Suspense } from "react";
import { EventsView } from "@/components/admin/views/events";

// Access is checked in the browser by AdminShell (see app/admin/layout.tsx).
export const instant = false;

export const metadata: Metadata = { title: "Events" };

export default function Page() {
  return (
    <Suspense>
      <EventsView />
    </Suspense>
  );
}
