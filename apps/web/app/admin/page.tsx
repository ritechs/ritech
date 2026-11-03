import { OverviewView } from "@/components/admin/views/overview";

// Access is checked in the browser by AdminShell (see app/admin/layout.tsx).
export const instant = false;

export default function AdminHome() {
  return <OverviewView />;
}
