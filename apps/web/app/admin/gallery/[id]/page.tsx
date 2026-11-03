import type { Metadata } from "next";
import { AlbumEditor } from "@/components/admin/views/gallery";

// Access is checked in the browser by AdminShell (see app/admin/layout.tsx).
export const instant = false;

export const metadata: Metadata = { title: "Album" };

export default async function Page({ params }: PageProps<"/admin/gallery/[id]">) {
  const { id } = await params;
  return <AlbumEditor id={id} />;
}
