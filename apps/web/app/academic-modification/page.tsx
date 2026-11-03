import type { Metadata } from "next";
import { ManagedPage, managedMetadata } from "@/components/page/managed-page";
import { getManagedPage } from "@/lib/server/content";
import { PageHeader } from "@/components/page/page-header";
import { ContactCard, PageBody, Prose, SectionNav } from "@/components/page/content";
import { academicModification } from "@/lib/content/programmes";
import { sectionLinks } from "@/lib/site";

const designedMetadata: Metadata = { title: "Academic Modification", description: academicModification.intro.slice(0, 155) };

export async function generateMetadata(): Promise<Metadata> {
  return managedMetadata("academic-modification", designedMetadata);
}

export default async function AcademicModificationPage() {
  const edited = await getManagedPage("academic-modification");
  if (edited) return <ManagedPage page={edited} crumbs={[{ label: "Home", href: "/" }, { label: "Solutions", href: "/solutions" }, { label: "Academic Modification" }]} aside={<><SectionNav title="Solutions" links={sectionLinks("Solutions")} current="/academic-modification" /><ContactCard heading="Request editing" person="Dr. Nadia Refat (editing, proofreading) · Dr. S M Nazmus Sadat (formatting)" /></>} />;

  return (
    <main id="main" className="flex-1">
      <PageHeader title="Academic Modification" description="Editing, proofreading and formatting by experienced academic editors." crumbs={[{ label: "Home", href: "/" }, { label: "Solutions", href: "/solutions" }, { label: "Academic Modification" }]} />
      <PageBody aside={<><SectionNav title="Solutions" links={sectionLinks("Solutions")} current="/academic-modification" /><ContactCard heading="Request editing" person="Dr. Nadia Refat (editing, proofreading) · Dr. S M Nazmus Sadat (formatting)" /></>}>
        <Prose paragraphs={[academicModification.intro]} />
        <ul className="mt-10 grid gap-4 md:grid-cols-3">
          {academicModification.services.map((s) => (
            <li key={s.title} className="rounded-lg border-t-2 border-brand bg-paper p-6">
              <h2 className="font-serif text-xl text-ink">{s.title}</h2>
              <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted-ink">{s.text}</p>
              <p className="mt-4 text-sm text-faint-ink">Contact: {s.contact}</p>
            </li>
          ))}
        </ul>
      </PageBody>
    </main>
  );
}
