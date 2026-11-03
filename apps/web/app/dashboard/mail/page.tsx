import type { Metadata } from "next";
import { Suspense } from "react";
import { MailView } from "@/components/dashboard/views/mail";

export const metadata: Metadata = { title: "Mail" };

export default function Page() {
  return (
    <Suspense>
      <MailView />
    </Suspense>
  );
}
