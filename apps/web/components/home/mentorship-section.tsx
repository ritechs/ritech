import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MentorStrip } from "@/components/home/mentor-strip";
import { Reveal } from "@/components/home/reveal";
import { SectionHeading } from "@/components/home/section-heading";
import { getFeaturedMentors, getMentors } from "@/lib/server/content";
import { routes } from "@/lib/site";

const helpsWith = [
  "Shaping a research question and design",
  "Choosing methods and analysing data",
  "Writing for, and responding to, peer review",
];

export async function MentorshipSection() {
  const [featuredMentors, mentors] = await Promise.all([getFeaturedMentors(), getMentors()]);
  return (
    <section id="mentorship" aria-labelledby="mentorship-heading" className="scroll-mt-20 bg-brand-wash py-16 md:py-20 lg:py-24">
      <div className="container-site grid gap-12 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-4">
          <SectionHeading
            id="mentorship-heading"
            title="Mentorship"
            description="RiTECHS pairs students and early-career researchers with experienced academics and industry researchers in the UK, Bangladesh, Australia and beyond."
          />
          <h3 className="mt-8 text-sm font-semibold text-ink">Mentors Can Help With</h3>
          <ul className="mt-3 space-y-2.5">
            {helpsWith.map((h) => (
              <li key={h} className="flex items-start gap-2.5 text-[0.9375rem] text-ink">
                <Check className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
                {h}
              </li>
            ))}
          </ul>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
            <Button asChild>
              <Link href={routes.registerMentee}>Find a Mentor</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={routes.registerMentor}>Become a Mentor</Link>
            </Button>
          </div>
        </div>

        <Reveal fade className="min-w-0 lg:col-span-8">
          <MentorStrip mentors={featuredMentors} />
          <Link href={routes.mentorship} className="tap-target mt-6 inline-flex items-center rounded-sm text-[0.9375rem] font-medium text-brand hover:underline">
            Browse All {mentors.length} Mentors
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
