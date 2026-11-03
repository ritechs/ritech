import type { Metadata } from "next";
import { ManagedPage, managedMetadata } from "@/components/page/managed-page";
import { getManagedPage } from "@/lib/server/content";
import { PageHeader } from "@/components/page/page-header";
import { ContactCard, PageBody, Prose, SectionNav } from "@/components/page/content";
import { training } from "@/lib/content/programmes";
import { sectionLinks } from "@/lib/site";

const designedMetadata: Metadata = { title: "Training", description: training.paragraphs[0].slice(0, 155) };

export async function generateMetadata(): Promise<Metadata> {
  return managedMetadata("elearning", designedMetadata);
}

export default async function TrainingPage() {
  const edited = await getManagedPage("elearning");
  if (edited) return <ManagedPage page={edited} crumbs={[{ label: "Home", href: "/" }, { label: "Training" }]} aside={<><SectionNav title="Training" links={sectionLinks("Training")} current="/eLearning" /><ContactCard heading="Course enquiries" /></>} />;

  return (
    <main id="main" className="flex-1">
      <PageHeader title="Training" crumbs={[{ label: "Home", href: "/" }, { label: "Training" }]} />
      <PageBody aside={<><SectionNav title="Training" links={sectionLinks("Training")} current="/eLearning" /><ContactCard heading="Course enquiries" /></>}>
        <Prose paragraphs={training.paragraphs} />
      </PageBody>
    </main>
  );
}
