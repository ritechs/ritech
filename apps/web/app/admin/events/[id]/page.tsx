import type { Metadata } from "next";
import { EventEditor } from "@/components/admin/views/events";

// Access is checked in the browser by AdminShell (see app/admin/layout.tsx).
export const instant = false;

export const metadata: Metadata = { title: "Events" };

export default async function Page({ params }: PageProps<"/admin/events/[id]">) {
  const { id } = await params;
  return <EventEditor id={id} />;
}
