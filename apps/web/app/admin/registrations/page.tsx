import type { Metadata } from "next";
import { Suspense } from "react";
import { RegistrationsView } from "@/components/admin/views/registrations";

// Access is checked in the browser by AdminShell (see app/admin/layout.tsx).
export const instant = false;

export const metadata: Metadata = { title: "Registrations" };

export default function Page() {
  return (
    <Suspense>
      <RegistrationsView />
    </Suspense>
  );
}
