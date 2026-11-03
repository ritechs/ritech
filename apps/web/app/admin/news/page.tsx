import type { Metadata } from "next";
import { Suspense } from "react";
import { NewsView } from "@/components/admin/views/news";

// Access is checked in the browser by AdminShell (see app/admin/layout.tsx).
export const instant = false;

export const metadata: Metadata = { title: "News" };

export default function Page() {
  return (
    <Suspense>
      <NewsView />
    </Suspense>
  );
}
