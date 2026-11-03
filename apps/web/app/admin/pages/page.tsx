import type { Metadata } from "next";
import { PagesView } from "@/components/admin/views/pages";

export const metadata: Metadata = { title: "Website Pages" };

export default function Page() {
  return <PagesView />;
}
