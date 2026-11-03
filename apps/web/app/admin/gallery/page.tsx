import type { Metadata } from "next";
import { Suspense } from "react";
import { GalleryView } from "@/components/admin/views/gallery";

// Access is checked in the browser by AdminShell (see app/admin/layout.tsx).
export const instant = false;

export const metadata: Metadata = { title: "Gallery" };

export default function Page() {
  return (
    <Suspense>
      <GalleryView />
    </Suspense>
  );
}
