"use client";

import { usePathname } from "next/navigation";

/** The admin area and the member dashboard have their own chrome, so the public header and footer step aside there. */
export function HideOnAdmin({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return path === "/admin" || path?.startsWith("/admin/") || path === "/dashboard" || path?.startsWith("/dashboard/") ? null : <>{children}</>;
}
