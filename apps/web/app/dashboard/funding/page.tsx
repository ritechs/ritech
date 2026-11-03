import type { Metadata } from "next";
import { Suspense } from "react";
import { FundingView } from "@/components/dashboard/views/funding";

export const metadata: Metadata = { title: "Funding & Grants" };

export default function Page() {
  return (
    <Suspense>
      <FundingView />
    </Suspense>
  );
}
