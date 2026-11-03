import type { Metadata } from "next";
import { MemberDetailView } from "@/components/admin/views/members";

// Access is checked in the browser by AdminShell (see app/admin/layout.tsx).
export const instant = false;

export const metadata: Metadata = { title: "Member" };

export default async function Page({ params }: PageProps<"/admin/members/[userId]">) {
  const { userId } = await params;
  return <MemberDetailView userId={userId} />;
}
