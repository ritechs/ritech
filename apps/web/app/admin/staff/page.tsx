import type { Metadata } from "next";
import { StaffView } from "@/components/admin/views/security";

// Access is checked in the browser by AdminShell (see app/admin/layout.tsx).
export const instant = false;

export const metadata: Metadata = { title: "Staff" };

export default function Page() {
  return <StaffView />;
}
