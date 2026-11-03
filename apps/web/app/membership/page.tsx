import type { Metadata } from "next";
import { ManagedPage, managedMetadata } from "@/components/page/managed-page";
import { getManagedPage } from "@/lib/server/content";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page/page-header";
import { LinkCard, PageBody, Prose, SectionNav, SectionTitle } from "@/components/page/content";
import { membership, mentorPage, menteePage } from "@/lib/content/organisation";
import { routes, sectionLinks } from "@/lib/site";

const designedMetadata: Metadata = { title: "Membership", description: membership.intro.slice(0, 155) };

export async function generateMetadata(): Promise<Metadata> {
  return managedMetadata("membership", designedMetadata);
}

export default async function MembershipPage() {
  const edited = await getManagedPage("membership");
  if (edited) return <ManagedPage page={edited} crumbs={[{ label: "Home", href: "/" }, { label: "Membership" }]} aside={<SectionNav title="Membership" links={sectionLinks("Membership")} current="/membership" />} />;

  return (
    <main id="main" className="flex-1">
      <PageHeader title="Membership" crumbs={[{ label: "Home", href: "/" }, { label: "Membership" }]}>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <Button asChild><Link href={routes.registerMentor}>Join as a Mentor</Link></Button>
          <Button asChild variant="outline"><Link href={routes.registerMentee}>Join as a Mentee</Link></Button>
        </div>
      </PageHeader>
      <PageBody aside={<SectionNav title="Membership" links={sectionLinks("Membership")} current="/membership" />}>
        <Prose paragraphs={[membership.intro]} />
        <SectionTitle>Join Us</SectionTitle>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <LinkCard href="/page-mentor" title="Mentor" text={mentorPage.definition} />
          <LinkCard href="/page-mentee" title="Mentee" text={menteePage.definition.split(". ")[0] + "."} />
          <LinkCard href="/mentorship" title="Mentoring Directory" text="Browse RiTECHS mentors by name, institution or expertise." />
          <LinkCard href="/why-join" title="Why to Join RiTECHS" text="Resources, opportunities, career advancement and a global network." />
        </div>
      </PageBody>
    </main>
  );
}
