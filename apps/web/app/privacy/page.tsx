import type { Metadata } from "next";
import { ManagedPage, managedMetadata } from "@/components/page/managed-page";
import { getManagedPage } from "@/lib/server/content";
import { PageHeader } from "@/components/page/page-header";
import { ContactCard, PageBody, Prose } from "@/components/page/content";
import { privacyNotice } from "@/lib/content/organisation";

const designedMetadata: Metadata = { title: "Privacy Policy", description: privacyNotice };

export async function generateMetadata(): Promise<Metadata> {
  return managedMetadata("privacy", designedMetadata);
}

export default async function PrivacyPage() {
  const edited = await getManagedPage("privacy");
  if (edited) return <ManagedPage page={edited} crumbs={[{ label: "Home", href: "/" }, { label: "Privacy Policy" }]} aside={<ContactCard heading="Privacy questions" />} />;

  return (
    <main id="main" className="flex-1">
      <PageHeader title="RiTECHS Privacy Policy" crumbs={[{ label: "Home", href: "/" }, { label: "Privacy Policy" }]} />
      <PageBody aside={<ContactCard heading="Privacy questions" />}>
        <Prose paragraphs={[privacyNotice]} />
      </PageBody>
    </main>
  );
}
