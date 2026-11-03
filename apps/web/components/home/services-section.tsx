import Link from "next/link";
import { ArrowRight, BookOpenText, FilePenLine, GraduationCap, MonitorPlay, Presentation, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SectionHeading } from "@/components/home/section-heading";
import { services } from "@/lib/data/services";
import type { ServiceId } from "@/lib/types";

const icons: Record<ServiceId, LucideIcon> = {
  publication: BookOpenText,
  mentorship: Users,
  conferences: Presentation,
  editing: FilePenLine,
  training: GraduationCap,
  elearning: MonitorPlay,
};

/** Services as editorial columns: a burgundy rule, icon, title, explanation and action. */
export function ServicesSection() {
  return (
    <section id="services" aria-labelledby="services-heading" className="scroll-mt-20 border-t border-rule bg-surface py-16 md:py-20 lg:py-24">
      <div className="container-site">
        <SectionHeading
          id="services-heading"
          title="Academic Services"
          description="Practical support at every stage of research, from first draft to conference presentation."
        />
        <ul className="mt-10 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:mt-14 lg:grid-cols-3">
          {services.map((s) => {
            const Icon = icons[s.id];
            return (
              <li key={s.id} className="flex flex-col border-t-2 border-brand pt-6">
                <div className="flex items-center gap-3">
                  <Icon className="size-5 shrink-0 text-brand" strokeWidth={1.6} aria-hidden />
                  <h3 className="font-serif text-xl leading-snug text-ink">{s.title}</h3>
                </div>
                <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted-ink">{s.description}</p>
                <Link
                  href={s.cta.href}
                  className="group tap-target mt-auto inline-flex items-center gap-1.5 self-start rounded-sm pt-4 text-sm font-medium text-brand hover:text-brand-strong"
                >
                  {s.cta.label}
                  <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
