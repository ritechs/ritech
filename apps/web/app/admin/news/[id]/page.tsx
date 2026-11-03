import type { Metadata } from "next";
import { NewsEditor } from "@/components/admin/views/news";

// Access is checked in the browser by AdminShell (see app/admin/layout.tsx).
export const instant = false;

export const metadata: Metadata = { title: "News" };

export default async function Page({ params }: PageProps<"/admin/news/[id]">) {
  const { id } = await params;
  return <NewsEditor id={id} />;
}
