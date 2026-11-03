"use client";

import Link from "next/link";
import { CalendarDays, Clock, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { StatusPill } from "@/components/events/status-pill";
import { DemoBadge } from "@/components/publications/parts";
import { routes } from "@/lib/site";
import type { AcademicEvent } from "@/lib/types";
import { formatDateRange, formatEventDay, formatEventTimeRange, formatPublicationDate } from "@/lib/utils";

export function EventWhen({ event }: { event: AcademicEvent }) {
  if (event.allDay) return <>{formatDateRange(event.startsAt, event.endsAt)}</>;
  return <>{formatEventDay(event.startsAt)}</>;
}

/** Full event details in a dialog: schedule, place, status, description, key dates and people. */
export function EventDialog({ event, trigger }: { event: AcademicEvent; trigger: React.ReactNode }) {
  const canRegister = event.registration.status === "open" || event.registration.status === "limited";
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent closeLabel="Close event details">
        <div className="overflow-y-auto px-6 pt-6 pb-4 sm:px-8 sm:pt-8">
          <div className="flex flex-wrap items-center gap-2 pr-10">
            <span className="text-sm font-medium text-brand">{event.category}</span>
            <StatusPill status={event.registration.status} />
            <DemoBadge show={event.source === "demo"} label="Demo event" />
          </div>
          {event.shortTitle && <p className="mt-4 font-serif text-xl text-brand">{event.shortTitle}</p>}
          <DialogTitle className={event.shortTitle ? "mt-1" : "mt-4"}>{event.title}</DialogTitle>
          <DialogDescription className="mt-2">{event.summary}</DialogDescription>

          <ul className="mt-6 grid gap-2.5 rounded-md border border-rule bg-paper p-4 text-[0.9375rem] text-ink sm:grid-cols-2">
            <li className="flex items-start gap-2.5">
              <CalendarDays className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
              <time dateTime={event.startsAt}>
                <EventWhen event={event} />
              </time>
            </li>
            {!event.allDay && (
              <li className="flex items-start gap-2.5">
                <Clock className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
                {formatEventTimeRange(event.startsAt, event.endsAt)} {event.timeZoneLabel}
              </li>
            )}
            <li className="flex items-start gap-2.5 sm:col-span-2">
              <MapPin className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
              {event.location}
            </li>
          </ul>

          <p className="mt-6 text-[0.9375rem] leading-relaxed text-ink/90">{event.description}</p>

          {event.keyDates && (
            <>
              <h3 className="mt-7 text-sm font-medium text-ink">Important Dates</h3>
              <ol className="mt-2 divide-y divide-rule rounded-md border border-rule">
                {event.keyDates.map((d) => (
                  <li key={d.label} className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:items-baseline sm:justify-between">
                    <span className="text-[0.9375rem] text-ink">{d.label}</span>
                    <time dateTime={d.date} className="text-[0.9375rem] font-medium text-ink numerals-tabular">
                      {formatPublicationDate(d.date)}
                    </time>
                  </li>
                ))}
              </ol>
            </>
          )}

          {event.people?.map((group) => (
            <div key={group.role}>
              <h3 className="mt-7 text-sm font-medium text-ink">{group.role}</h3>
              <ul className="mt-2 grid gap-x-6 gap-y-1 font-serif text-[1.0625rem] text-ink sm:grid-cols-2">
                {group.names.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3 border-t border-rule bg-paper px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p className="text-sm text-muted-ink">{event.registration.note}</p>
          <Button asChild>
            <Link href={`${routes.register}?event=${event.slug}`}>{canRegister ? "Register for This Event" : "Register Your Interest"}</Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
