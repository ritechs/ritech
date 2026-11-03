import type { Metadata } from "next";
import { ManagedPage, managedMetadata } from "@/components/page/managed-page";
import { getManagedPage } from "@/lib/server/content";
import { PageHeader } from "@/components/page/page-header";
import { ContactCard, PageBody, SectionNav } from "@/components/page/content";
import { sectionLinks } from "@/lib/site";

const designedMetadata: Metadata = { title: "Training Partner" };

export async function generateMetadata(): Promise<Metadata> {
  return managedMetadata("trainingpartner", designedMetadata);
}

export default async function TrainingPartnerPage() {
  const edited = await getManagedPage("trainingpartner");
  if (edited) return <ManagedPage page={edited} crumbs={[{ label: "Home", href: "/" }, { label: "Training", href: "/eLearning" }, { label: "Training Partner" }]} aside={<SectionNav title="Training" links={sectionLinks("Training")} current="/TrainingPartner" />} />;

  return (
    <main id="main" className="flex-1">
      <PageHeader title="Training Partner" crumbs={[{ label: "Home", href: "/" }, { label: "Training", href: "/eLearning" }, { label: "Training Partner" }]} />
      <PageBody aside={<SectionNav title="Training" links={sectionLinks("Training")} current="/TrainingPartner" />}>
        <p className="max-w-[60ch] text-[1.0625rem] leading-relaxed text-ink/90">
          RiTECHS works with training partners to deliver courses and workshops. Details of current partners are being moved
          from the previous website.
        </p>
        <div className="mt-8 max-w-md"><ContactCard heading="Become a training partner" /></div>
      </PageBody>
    </main>
  );
}
