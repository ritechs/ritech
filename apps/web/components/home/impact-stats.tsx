import { getStats } from "@/lib/server/content";
import type { ImpactStat } from "@/lib/types";
import { cn } from "@/lib/utils";

// 2×2 on small screens, one row from lg; dividers only between neighbours.
const cellClass = [
  "pr-4",
  "border-l border-rule pl-5 sm:pl-8",
  "pr-4 lg:border-l lg:border-rule lg:pl-8",
  "border-l border-rule pl-5 sm:pl-8",
];

/** Live figures counted from the database. Hidden until there is data to show. */
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
    <section aria-labelledby="impact-heading" className="border-y border-rule bg-paper">
      <div className="container-site py-12 md:py-14">
        <h2 id="impact-heading" className="sr-only">
          RiTECHS in numbers
        </h2>
        <dl className="grid grid-cols-2 gap-y-10 lg:grid-cols-4">
          {items.map((s, i) => (
            <div
              key={s.label}
              className={cn("flex flex-col", cellClass[i])}
            >
              <dt className="order-2 mt-2 text-[0.9375rem] font-medium text-ink">{s.label}</dt>
              <dd className="order-1 font-serif text-[2.5rem] leading-none text-brand numerals-tabular sm:text-5xl">
                {s.value}
                {s.suffix}
              </dd>
              <dd className="order-3 mt-1 text-sm text-muted-ink">{s.description}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
