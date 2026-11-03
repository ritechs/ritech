import type { Metadata } from "next";
import { Suspense } from "react";
import { MailingView } from "@/components/admin/views/mailing";

// Access is checked in the browser by AdminShell (see app/admin/layout.tsx).
export const instant = false;

export const metadata: Metadata = { title: "Mailing" };

export default function Page() {
  return (
    <Suspense>
      <MailingView />
    </Suspense>
  );
}
