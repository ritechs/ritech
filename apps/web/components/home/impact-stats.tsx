import { CountUp } from "@/components/home/count-up";
import { Reveal } from "@/components/home/reveal";
import { SectionHeading } from "@/components/home/section-heading";
import { getStats } from "@/lib/server/content";
import type { ImpactStat } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Live figures counted from the database, on a warm band whose angled top
 * meets the dark band above it. Numbers count up as they scroll into view.
 * Hidden until there is data to show.
 */
export async function ImpactStats() {
  const s = await getStats();
  const items: ImpactStat[] = [
    { value: s.conferences, label: "International conferences", description: "Hosted or co-organised since 2021" },
    { value: s.mentors, label: "Research mentors", description: "Academics and industry researchers" },
    { value: s.members, label: "Community members", description: "Approved mentors and mentees" },
    { value: s.countries, label: "Countries", description: "Where our members are based" },
  ];
  if (items.every((i) => i.value === 0)) return null;
  return (
    <section aria-labelledby="impact-heading" className="relative z-10 -mt-[3.5vw] bg-sand clip-angle-follow">
      <div className="container-site pt-[calc(4rem+3.5vw)] pb-[calc(4rem+3.5vw)] md:pt-[calc(5rem+3.5vw)] md:pb-[calc(5rem+3.5vw)]">
        <SectionHeading id="impact-heading" title="RiTECHS in Numbers" align="center" />
        <dl className="mt-12 grid grid-cols-2 gap-y-12 lg:grid-cols-4">
          {items.map((it, i) => (
            <Reveal
              key={it.label}
              index={i}
              className={cn(
                "relative flex flex-col items-center px-3 text-center",
                // Slanted dashed dividers between neighbours
                "after:absolute after:top-[8%] after:right-0 after:h-[84%] after:w-0.5 after:-skew-x-[18deg] after:bg-[repeating-linear-gradient(180deg,var(--brand-tint)_0_8px,transparent_8px_14px)]",
                i % 2 === 1 && "after:hidden lg:after:block",
                i === items.length - 1 && "lg:after:hidden",
              )}
            >
              <dt className="order-2 mt-3 text-base font-semibold text-ink">{it.label}</dt>
              <dd className="order-1 font-headline text-[clamp(3.5rem,2.4rem+4vw,5.75rem)] leading-none font-bold text-brand">
                <CountUp value={it.value} suffix={it.suffix} />
              </dd>
              <dd className="order-3 mt-1 max-w-[15rem] text-sm text-muted-ink">{it.description}</dd>
            </Reveal>
          ))}
        </dl>
      </div>
    </section>
  );
}
