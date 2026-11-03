import type { Metadata } from "next";
import { SectionNav } from "@/components/page/content";
import { ManagedPage, managedMetadata } from "@/components/page/managed-page";
import { getManagedPage } from "@/lib/server/content";
import { sectionLinks } from "@/lib/site";
import { MentoringRolePage } from "@/components/page/mentoring-role";
import { mentorPage } from "@/lib/content/organisation";

const designedMetadata: Metadata = { title: "Mentor", description: mentorPage.definition };

export async function generateMetadata(): Promise<Metadata> {
  return managedMetadata("page-mentor", designedMetadata);
}

export default async function MentorInfoPage() {
  const edited = await getManagedPage("page-mentor");
  if (edited)
    return (
      <ManagedPage
        page={edited}
        crumbs={[{ label: "Home", href: "/" }, { label: "Membership", href: "/membership" }, { label: "Mentor" }]}
        aside={<SectionNav title="Membership" links={sectionLinks("Membership")} current="/page-mentor" />}
      />
    );
  return <MentoringRolePage role="Mentor" content={mentorPage} />;
}
