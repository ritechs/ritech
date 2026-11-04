import Link from "next/link";
import { Reveal } from "@/components/home/reveal";
import { ResearchNetwork } from "@/components/home/research-network";
import { SectionHeading } from "@/components/home/section-heading";
import { routes } from "@/lib/site";

const links = [
  { label: "Explore Publications", href: routes.publications },
  { label: "Find a Mentor", href: routes.mentorship },
  { label: "Attend a Conference", href: routes.conferences },
  { label: "Join Our Research Community", href: routes.register },
];

/** Dark patterned band with the research-areas network and quick links, like "Built for Your Future" on usf.edu. */
export function BuiltForResearch() {
  return (
    <section aria-labelledby="built-heading" className="relative bg-brand-deep bg-weave text-white clip-angle-bottom">
      <div className="container-site grid items-center gap-12 pt-16 pb-[calc(4rem+3.5vw)] md:pt-20 lg:grid-cols-12 lg:gap-14 lg:pt-24 lg:pb-[calc(6rem+3.5vw)]">
        <Reveal fade className="lg:col-span-6">
          <ResearchNetwork />
        </Reveal>
        <div className="lg:col-span-6">
          <SectionHeading
            id="built-heading"
            inverse
            title="Built for Your Research"
            description="Practical support at every stage of research, from first draft to conference presentation, across six research areas and one community."
          />
          <ul className="mt-7 border-t border-white/20">
            {links.map((l) => (
              <li key={l.href} className="border-b border-white/20">
                <Link
                  href={l.href}
                  className="group flex min-h-14 items-center justify-between gap-4 py-3 text-[1.0625rem] font-semibold transition-colors hover:text-highlight"
                >
                  {l.label}
                  <span aria-hidden className="text-2xl leading-none text-highlight transition-transform group-hover:translate-x-1">
                    »
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
