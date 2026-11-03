import type { Metadata } from "next";
import { Suspense } from "react";
import { PeopleView } from "@/components/dashboard/views/people";

export const metadata: Metadata = { title: "My Connections" };

export default function Page() {
  return (
    <Suspense>
      <PeopleView />
    </Suspense>
  );
}
