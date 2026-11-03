import type { Metadata } from "next";
import { Suspense } from "react";
import { RequestsView } from "@/components/dashboard/views/requests";

export const metadata: Metadata = { title: "Requests" };

export default function Page() {
  return (
    <Suspense>
      <RequestsView />
    </Suspense>
  );
}
