import type { Metadata } from "next";
import { Suspense } from "react";
import { SpeakersView } from "@/components/admin/views/library";

// Access is checked in the browser by AdminShell (see app/admin/layout.tsx).
export const instant = false;

export const metadata: Metadata = { title: "Speakers" };

export default function Page() {
  return (
    <Suspense>
      <SpeakersView />
    </Suspense>
  );
}
