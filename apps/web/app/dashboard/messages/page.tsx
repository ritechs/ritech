import type { Metadata } from "next";
import { Suspense } from "react";
import { MessagesView } from "@/components/dashboard/views/messages";

export const metadata: Metadata = { title: "Messages" };

export default function Page() {
  return (
    <Suspense>
      <MessagesView />
    </Suspense>
  );
}
