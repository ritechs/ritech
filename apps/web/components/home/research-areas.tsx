import { ArrowRight, BrainCircuit, Code2, Cpu, Leaf, LineChart, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AreaLink } from "@/components/home/area-link";
import { SectionHeading } from "@/components/home/section-heading";
import { researchAreas } from "@/lib/data/research-areas";
import type { ResearchAreaSlug } from "@/lib/types";

const icons: Record<ResearchAreaSlug, LucideIcon> = {
  "ai-ml": BrainCircuit,
  cybersecurity: ShieldCheck,
  "data-science": LineChart,
  "software-engineering": Code2,
  "sustainable-technology": Leaf,
  "emerging-technologies": Cpu,
};

export function ResearchAreas() {
  return (
    <section id="research-areas" aria-labelledby="areas-heading" className="scroll-mt-20 border-t border-rule bg-paper py-16 md:py-20 lg:py-24">
      <div className="container-site">
        <SectionHeading
          id="areas-heading"
          title="Research Areas"
          description="The disciplines RiTECHS publishes, convenes and mentors in. Each links to the related papers above."
        />
        <ul className="mt-10 grid gap-px overflow-hidden rounded-lg border border-rule bg-rule sm:grid-cols-2 lg:mt-12 lg:grid-cols-3">
          {researchAreas.map((a) => {
            const Icon = icons[a.slug];
            return (
              <li key={a.slug} className="group relative flex flex-col bg-surface p-6 transition-colors hover:bg-brand-wash/50 sm:p-8">
                <Icon className="size-7 text-brand" strokeWidth={1.4} aria-hidden />
                <h3 className="mt-5 font-serif text-[1.3125rem] leading-snug text-ink">{a.name}</h3>
                <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted-ink">{a.description}</p>
                <AreaLink
                  area={a.slug}
                  className="mt-auto inline-flex items-center gap-1.5 self-start rounded-sm pt-6 text-sm font-medium text-brand after:absolute after:inset-0"
                >
                  Explore Publications
                  <span className="sr-only"> in {a.name}</span>
                  <ArrowRight className="size-3.5 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden />
                </AreaLink>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
