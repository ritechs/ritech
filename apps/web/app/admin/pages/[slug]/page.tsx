import type { Metadata } from "next";
import { PageEditor } from "@/components/admin/views/pages";

export const metadata: Metadata = { title: "Website Page" };

export default async function Page({ params }: PageProps<"/admin/pages/[slug]">) {
  const { slug } = await params;
  return <PageEditor slug={slug} />;
}
