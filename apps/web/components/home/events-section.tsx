import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EventDialog, EventWhen } from "@/components/events/event-dialog";
import { StatusPill } from "@/components/events/status-pill";
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
    <article aria-labelledby="featured-conf-title" className="grid overflow-hidden rounded-lg bg-brand text-white lg:grid-cols-12">
      {conf.image && (
        <div className="relative aspect-[16/9] lg:order-2 lg:col-span-5 lg:aspect-auto">
          <Image src={conf.image} alt="" fill sizes="(min-width: 1024px) 40vw, 100vw" className="object-cover" />
        </div>
      )}
      <div className={`p-6 sm:p-8 lg:order-1 lg:p-10 xl:p-12 ${conf.image ? "lg:col-span-7" : "lg:col-span-12"}`}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-white/75">Featured Conference</span>
          <StatusPill status={conf.registration.status} inverse />
        </div>
        <p className="mt-5 font-serif text-4xl leading-none font-medium tracking-[-0.01em] sm:text-5xl">{conf.shortTitle}</p>
        <h3 id="featured-conf-title" className="mt-4 max-w-[30ch] font-serif text-xl leading-snug text-white/95 [text-wrap:balance] sm:text-2xl">
          {conf.title}
        </h3>
        <ul className="mt-6 space-y-2 text-[0.9375rem] text-white/90">
          <li className="flex items-center gap-2.5">
            <CalendarDays className="size-4 text-white/70" aria-hidden />
            <time dateTime={conf.startsAt}>
              <EventWhen event={conf} />
            </time>
          </li>
          <li className="flex items-center gap-2.5">
            <MapPin className="size-4 text-white/70" aria-hidden />
            {conf.location}
          </li>
        </ul>
        {opens && (
          <dl className={`mt-7 grid max-w-md border-t border-white/20 pt-5 ${deadline ? "grid-cols-2" : "grid-cols-1"}`}>
            <div className="pr-4">
              <dt className="text-[0.8125rem] text-white/70">{opens.label}</dt>
              <dd className="mt-1 font-medium">{formatPublicationDate(opens.date)}</dd>
            </div>
            {deadline && (
              <div className="border-l border-white/20 pl-4">
                <dt className="text-[0.8125rem] text-white/70">{deadline.label}</dt>
                <dd className="mt-1 font-medium">{formatPublicationDate(deadline.date)}</dd>
              </div>
            )}
          </dl>
        )}
        <div className="mt-8">
          <EventDialog
            event={conf}
            trigger={
              <Button variant="inverse" size="lg">
                View Event Details
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
    <section id="events" aria-labelledby="events-heading" className="scroll-mt-20 border-t border-rule bg-surface py-16 md:py-20 lg:py-24">
      <div className="container-site">
        <SectionHeading
          id="events-heading"
          title="Conferences & Academic Events"
          description="International conferences hosted with universities in the UK, Europe, Africa and Asia, alongside seminars, boot camps and Research Adda sessions."
        />
        {conf && (
          <div className="mt-10 lg:mt-12">
            <FeaturedConference conf={conf} />
          </div>
        )}
        <div className="mt-12 flex flex-wrap items-end justify-between gap-4">
          <h3 className="font-serif text-2xl text-ink">Recent Conferences</h3>
          <Link href={routes.conferences} className="tap-target inline-flex items-center gap-1.5 rounded-sm text-[0.9375rem] font-medium text-brand hover:underline">
            All Conferences
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
        <ul className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {recentConferences.map((c) => (
            <li key={c.slug}>
              <ConferenceCard conference={c} today={today} showPoster />
            </li>
          ))}
        </ul>
        <nav aria-label="Other events" className="mt-10 border-t border-rule pt-6">
          <ul className="flex flex-wrap gap-x-8 gap-y-3 text-[0.9375rem]">
            {eventTypes.map((e) => (
              <li key={e.slug}>
                <Link href={e.href} className="tap-target inline-flex items-center gap-1.5 rounded-sm font-medium text-ink hover:text-brand">
                  {e.title}
                  <ArrowRight className="size-4 text-brand" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </section>
  );
}
