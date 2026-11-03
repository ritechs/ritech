import type { Metadata } from "next";
import { ManagedPage, managedMetadata } from "@/components/page/managed-page";
import { getManagedPage } from "@/lib/server/content";
import { PageHeader } from "@/components/page/page-header";
import { PageBody, SectionNav, SectionTitle } from "@/components/page/content";
import { procedure } from "@/lib/content/organisation";
import { sectionLinks } from "@/lib/site";

const designedMetadata: Metadata = { title: "Procedure", description: "How RiTECHS runs its mentoring and research programme, step by step." };

export async function generateMetadata(): Promise<Metadata> {
  return managedMetadata("procedure", designedMetadata);
}

export default async function ProcedurePage() {
  const edited = await getManagedPage("procedure");
  if (edited) return <ManagedPage page={edited} crumbs={[{ label: "Home", href: "/" }, { label: "About", href: "/aboutus" }, { label: "Procedure" }]} aside={<SectionNav title="About" links={sectionLinks("About")} current="/procedure" />} />;

  return (
    <main id="main" className="flex-1">
      <PageHeader title="Procedure" description="How RiTECHS builds and runs its mentoring and research programme." crumbs={[{ label: "Home", href: "/" }, { label: "About", href: "/aboutus" }, { label: "Procedure" }]} />
      <PageBody aside={<SectionNav title="About" links={sectionLinks("About")} current="/procedure" />}>
        <ol className="space-y-4">
          {procedure.stages.map((s, i) => (
            <li key={s.title} className="rounded-lg border border-rule bg-surface p-6">
              <h2 className="flex items-baseline gap-3 font-serif text-xl text-ink">
                <span className="font-serif text-brand numerals-tabular">{i + 1}.</span>
                {s.title}
              </h2>
              <ol className="mt-3 list-[lower-alpha] space-y-1.5 pl-12 text-[0.9375rem] leading-relaxed text-ink/90 marker:text-faint-ink">
                {s.steps.map((st) => (
                  <li key={st}>{st}</li>
                ))}
              </ol>
            </li>
          ))}
        </ol>
        <SectionTitle>Output Goals</SectionTitle>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {procedure.outcomes.map((o) => (
            <section key={o.for} className="rounded-lg border-t-2 border-brand bg-paper p-6">
              <h3 className="font-serif text-xl text-ink">{o.for}</h3>
              <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted-ink">{o.text}</p>
            </section>
          ))}
        </div>
      </PageBody>
    </main>
  );
}
