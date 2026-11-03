import type { Metadata } from "next";
import { Suspense } from "react";
import { ExpertiseView } from "@/components/dashboard/views/expertise";

export const metadata: Metadata = { title: "Expertise" };

export default function Page() {
  return (
    <Suspense>
      <ExpertiseView />
    </Suspense>
  );
}
