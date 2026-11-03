import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page/page-header";
import { BulletList, PageBody, SectionNav, SectionTitle, Steps, TitledGrid } from "@/components/page/content";
import { mentorPage } from "@/lib/content/organisation";
import { routes, sectionLinks } from "@/lib/site";

/** Shared layout for the Mentor and Mentee information pages. */
export function MentoringRolePage({ role, content }: { role: "Mentor" | "Mentee"; content: typeof mentorPage }) {
  const registerHref = role === "Mentor" ? routes.registerMentor : routes.registerMentee;
  const current = role === "Mentor" ? "/page-mentor" : "/page-mentee";
  return (
    <main id="main" className="flex-1">
      <PageHeader title={role} description={content.definition} crumbs={[{ label: "Home", href: "/" }, { label: "Membership", href: "/membership" }, { label: role }]}>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <Button asChild><Link href={registerHref}>Join as a {role}</Link></Button>
          <Button asChild variant="outline"><Link href={routes.mentorship}>Mentoring Directory</Link></Button>
        </div>
      </PageHeader>
      <PageBody aside={<SectionNav title="Membership" links={sectionLinks("Membership")} current={current} />}>
        <SectionTitle>Who can be a {role.toLowerCase()}</SectionTitle>
        <p className="mt-3 text-[1rem] text-muted-ink">{content.eligibilityIntro}</p>
        <BulletList items={content.eligibility} />
        <SectionTitle>How and where to manage the mentoring partnership</SectionTitle>
        <TitledGrid items={content.channels} />
        <SectionTitle>Mentoring timeline</SectionTitle>
        <Steps items={content.timeline} />
      </PageBody>
    </main>
  );
}
