import { ArrowRight, BrainCircuit, Code2, Cpu, Leaf, LineChart, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AreaLink } from "@/components/home/area-link";
import { Reveal } from "@/components/home/reveal";
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

/** Follows the numbers band: its negative top margin fills the band's angled lower edge. */
export function ResearchAreas() {
  return (
    <section id="research-areas" aria-labelledby="areas-heading" className="-mt-[3.5vw] scroll-mt-20 bg-paper pt-[calc(4rem+3.5vw)] pb-16 md:pt-[calc(5rem+3.5vw)] md:pb-20 lg:pt-[calc(6rem+3.5vw)] lg:pb-24">
      <div className="container-site">
        <SectionHeading
          id="areas-heading"
          title="Research Areas"
          description="The disciplines RiTECHS publishes, convenes and mentors in. Each links to the related papers below."
        />
        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:mt-12 lg:grid-cols-3 lg:gap-6">
          {researchAreas.map((a, i) => {
            const Icon = icons[a.slug];
            return (
              <Reveal
                as="li"
                key={a.slug}
                index={i % 3}
                className="group relative flex flex-col border border-rule border-t-[6px] border-t-brand bg-surface p-6 transition-shadow hover:shadow-[0_14px_30px_-18px_rgb(0_0_0/0.35)] sm:p-7"
              >
                <Icon className="size-7 text-brand" strokeWidth={1.4} aria-hidden />
                <h3 className="mt-4 text-[1.1875rem] leading-snug font-semibold text-brand">{a.name}</h3>
                <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted-ink">{a.description}</p>
                <AreaLink
                  area={a.slug}
                  className="mt-auto inline-flex items-center gap-1.5 self-start rounded-sm pt-6 text-sm font-semibold text-brand after:absolute after:inset-0"
                >
                  Explore Publications
                  <span className="sr-only"> in {a.name}</span>
                  <ArrowRight className="size-3.5 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden />
                </AreaLink>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
