import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Suspense } from "react";
import { MentorCard } from "@/components/mentors/mentor-card";
import { MentorDirectory } from "@/components/mentors/mentor-directory";
import { PageHeader } from "@/components/page/page-header";
import { getMentors } from "@/lib/server/content";
import { routes } from "@/lib/site";

export const metadata: Metadata = {
  title: "Mentorship",
  description: "Find a RiTECHS research mentor, or join as a mentor to support early-career researchers.",
};

export default async function MentorshipPage() {
  const mentors = await getMentors();
  return (
    <main id="main" className="flex-1">
      <PageHeader
        title="Mentoring Directory"
        description="Experienced academics and industry researchers who guide students and early-career researchers on research design, writing and publication."
        crumbs={[{ label: "Home", href: "/" }, { label: "Mentorship" }]}
      >
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <Button asChild>
            <Link href={routes.registerMentee}>Register as a Mentee</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={routes.registerMentor}>Become a Mentor</Link>
          </Button>
        </div>
      </PageHeader>
      <div className="container-site py-12 md:py-16">
        <Suspense
          fallback={
            <ul className="mt-[4.75rem] grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {mentors.map((m) => (
                <li key={m.id}>
                  <MentorCard mentor={m} />
                </li>
              ))}
            </ul>
          }
        >
          <MentorDirectory mentors={mentors} />
        </Suspense>
      </div>
    </main>
  );
}
