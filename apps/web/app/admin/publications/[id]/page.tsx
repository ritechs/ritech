import type { Metadata } from "next";
import { PublicationEditor } from "@/components/admin/views/publications";

// Access is checked in the browser by AdminShell (see app/admin/layout.tsx).
export const instant = false;

export const metadata: Metadata = { title: "Publication" };

export default async function Page({ params }: PageProps<"/admin/publications/[id]">) {
  const { id } = await params;
  return <PublicationEditor id={id} />;
}
