import type { Metadata } from "next";
import { ConferenceEditor } from "@/components/admin/views/conferences";

// Access is checked in the browser by AdminShell (see app/admin/layout.tsx).
export const instant = false;

export const metadata: Metadata = { title: "Conference" };

export default async function Page({ params }: PageProps<"/admin/conferences/[id]">) {
  const { id } = await params;
  return <ConferenceEditor id={id} />;
}
