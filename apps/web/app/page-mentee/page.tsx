import type { Metadata } from "next";
import { SectionNav } from "@/components/page/content";
import { ManagedPage, managedMetadata } from "@/components/page/managed-page";
import { getManagedPage } from "@/lib/server/content";
import { sectionLinks } from "@/lib/site";
import { MentoringRolePage } from "@/components/page/mentoring-role";
import { menteePage } from "@/lib/content/organisation";

const designedMetadata: Metadata = { title: "Mentee", description: menteePage.definition.slice(0, 155) };

export async function generateMetadata(): Promise<Metadata> {
  return managedMetadata("page-mentee", designedMetadata);
}

export default async function MenteeInfoPage() {
  const edited = await getManagedPage("page-mentee");
  if (edited)
    return (
      <ManagedPage
        page={edited}
        crumbs={[{ label: "Home", href: "/" }, { label: "Membership", href: "/membership" }, { label: "Mentee" }]}
        aside={<SectionNav title="Membership" links={sectionLinks("Membership")} current="/page-mentee" />}
      />
    );
  return <MentoringRolePage role="Mentee" content={menteePage} />;
}
