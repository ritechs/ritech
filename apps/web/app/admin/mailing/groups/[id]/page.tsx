import type { Metadata } from "next";
import { MailGroupView } from "@/components/admin/views/mailing";

// Access is checked in the browser by AdminShell (see app/admin/layout.tsx).
export const instant = false;

export const metadata: Metadata = { title: "Mail Group" };

export default async function Page({ params }: PageProps<"/admin/mailing/groups/[id]">) {
  const { id } = await params;
  return <MailGroupView id={id} />;
}
