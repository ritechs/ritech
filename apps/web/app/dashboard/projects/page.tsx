import type { Metadata } from "next";
import { Suspense } from "react";
import { ProjectsView } from "@/components/dashboard/views/projects";

export const metadata: Metadata = { title: "Research Projects" };

export default function Page() {
  return (
    <Suspense>
      <ProjectsView />
    </Suspense>
  );
}
