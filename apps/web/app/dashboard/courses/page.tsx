import type { Metadata } from "next";
import { Suspense } from "react";
import { CoursesView } from "@/components/dashboard/views/courses";

export const metadata: Metadata = { title: "My Courses" };

export default function Page() {
  return (
    <Suspense>
      <CoursesView />
    </Suspense>
  );
}
