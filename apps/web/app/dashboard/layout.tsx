import type { Metadata } from "next";
import { Suspense } from "react";
import { MemberShell } from "@/components/dashboard/shell";

export const metadata: Metadata = { title: { default: "My Dashboard", template: "%s · My Dashboard · RiTECHS" }, robots: { index: false, follow: false } };

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <Suspense>
      <MemberShell>{children}</MemberShell>
    </Suspense>
  );
}
