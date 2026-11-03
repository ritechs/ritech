import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminShell } from "@/components/admin/shell";

// AdminShell checks access in the browser (/api/me) before rendering any admin page, so no page
// can be part of the prerendered shell. Opt the whole area out of instant-navigation validation.
export const instant = false;

export const metadata: Metadata ={ title: { default: "Admin", template: "%s · RiTECHS Admin" }, robots: { index: false, follow: false } };

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <Suspense>
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}
