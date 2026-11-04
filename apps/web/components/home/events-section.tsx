import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EventDialog, EventWhen } from "@/components/events/event-dialog";
import { StatusPill } from "@/components/events/status-pill";
import { Reveal } from "@/components/home/reveal";
import { SectionHeading } from "@/components/home/section-heading";
import { ConferenceCard } from "@/components/conferences/conference-card";
import type { AcademicEvent } from "@/lib/types";
import { getFeaturedConference, getRecentConferences } from "@/lib/server/content";
import { eventTypes } from "@/lib/content/programmes";
import { routes } from "@/lib/site";
import { getToday } from "@/lib/today";
import { formatPublicationDate } from "@/lib/utils";

function FeaturedConference({ conf }: { conf: AcademicEvent }) {
  const [opens, deadline] = conf.keyDates ?? [];
  return (
    <article aria-labelledby="featured-conf-title" className="grid overflow-hidden bg-brand text-white shadow-[0_18px_40px_-24px_rgb(0_0_0/0.5)] lg:grid-cols-12">
      {conf.image && (
        <div className="relative aspect-[16/9] lg:col-span-6 lg:aspect-auto">
          <Image src={conf.image} alt="" fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
        </div>
      )}
      <div className={`p-6 sm:p-8 lg:p-10 xl:p-12 ${conf.image ? "lg:col-span-6" : "lg:col-span-12"}`}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-white/75">Featured Conference</span>
          <StatusPill status={conf.registration.status} inverse />
        </div>
        <p translate="no" className="mt-4 font-headline text-5xl leading-none font-semibold tracking-[0.01em] uppercase sm:text-6xl">
          {conf.shortTitle}
        </p>
        <h3 id="featured-conf-title" className="mt-4 max-w-[34ch] text-lg leading-snug text-white/95 [text-wrap:balance] sm:text-xl">
          {conf.title}
        </h3>
        <ul className="mt-6 space-y-2 text-[0.9375rem] text-white/90">
          <li className="flex items-center gap-2.5">
            <CalendarDays className="size-4 text-highlight" aria-hidden />
            <time dateTime={conf.startsAt}>
              <EventWhen event={conf} />
            </time>
          </li>
          <li className="flex items-center gap-2.5">
            <MapPin className="size-4 text-highlight" aria-hidden />
            {conf.location}
          </li>
        </ul>
        {opens && (
          <dl className={`mt-7 grid max-w-md border-t border-white/20 pt-5 ${deadline ? "grid-cols-2" : "grid-cols-1"}`}>
            <div className="pr-4">
              <dt className="text-[0.8125rem] text-white/70">{opens.label}</dt>
              <dd className="mt-1 font-semibold">{formatPublicationDate(opens.date)}</dd>
            </div>
            {deadline && (
              <div className="border-l border-white/20 pl-4">
                <dt className="text-[0.8125rem] text-white/70">{deadline.label}</dt>
                <dd className="mt-1 font-semibold">{formatPublicationDate(deadline.date)}</dd>
              </div>
            )}
          </dl>
        )}
        <div className="mt-8">
          <EventDialog
            event={conf}
            trigger={
              <Button variant="highlight" size="lg">
                View Event Details <ArrowRight aria-hidden />
              </Button>
            }
          />
        </div>
      </div>
    </article>
  );
}

export async function EventsSection() {
  const today = await getToday();
  const conf = await getFeaturedConference();
  const recentConferences = await getRecentConferences(conf?.slug);
  return (
    <section id="events" aria-labelledby="events-heading" className="scroll-mt-20 bg-surface py-16 md:py-20 lg:py-24">
      <div className="container-site">
        <SectionHeading
          id="events-heading"
          title="Conferences & Academic Events"
          description="International conferences hosted with universities in the UK, Europe, Africa and Asia, alongside seminars, boot camps and Research Adda sessions."
          action={{ label: "All Conferences", href: routes.conferences }}
        />
        {conf && (
          <Reveal fade className="mt-10 lg:mt-12">
            <FeaturedConference conf={conf} />
          </Reveal>
        )}
        {recentConferences.length > 0 && (
          <>
            <h3 className="mt-14 font-headline text-2xl font-semibold tracking-[0.02em] text-ink uppercase">Recent Conferences</h3>
            <ul className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {recentConferences.map((c, i) => (
                <Reveal as="li" key={c.slug} index={i % 3}>
                  <ConferenceCard conference={c} today={today} showPoster />
                </Reveal>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}

/** Seminars, boot camps and other programmes as tall tiles, like the video row on usf.edu. */
export function ProgrammeTiles() {
  const shades = ["bg-brand", "bg-ink", "bg-brand-strong", "bg-brand-deep"];
  return (
    <section aria-labelledby="programmes-heading" className="relative overflow-hidden bg-paper py-16 md:py-20 lg:py-24">
      <div aria-hidden className="absolute -top-24 -left-40 size-[34rem] rounded-full border-[4rem] border-brand/[0.05]" />
      <div className="container-site relative">
        <SectionHeading id="programmes-heading" title="Learn With RiTECHS" align="center" />
        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {eventTypes.map((e, i) => (
            <Reveal as="li" key={e.slug} index={i}>
              <Link
                href={e.href}
                className={`group flex h-full min-h-72 flex-col justify-end border-2 border-highlight/80 p-6 text-white transition-transform duration-300 hover:-translate-y-1 ${shades[i % shades.length]}`}
              >
                <span className="font-headline text-[1.75rem] leading-tight font-semibold uppercase">{e.title}</span>
                <span className="mt-2 text-[0.9375rem] leading-relaxed text-white/85">{e.summary}</span>
                <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-highlight">
                  Learn More <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </span>
              </Link>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
