import { CalendarDays, MapPin, Ticket, Users } from "lucide-react";
import { getEvents, type EventType } from "@/lib/server/content";
import { getToday } from "@/lib/today";
import { cn } from "@/lib/utils";

const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/London" });

const MODE: Record<string, string> = { online: "Online", hybrid: "Hybrid", "in-person": "Face to face" };

/** Events of one type from the database, as edited in Admin → Events. */
export async function EventList({ type, empty, className }: { type: EventType; empty: string; className?: string }) {
  const [events, today] = await Promise.all([getEvents(type), getToday()]);
  if (!events.length) return <p className={cn("mt-6 rounded-lg border border-dashed border-rule-strong bg-paper p-5 text-[0.9375rem] text-muted-ink", className)}>{empty}</p>;
  return (
    <ul className={cn("mt-6 grid gap-4 md:grid-cols-2", className)}>
      {events.map((e) => {
        const day = e.startsAt?.slice(0, 10);
        const upcoming = !day || (e.endsAt ?? e.startsAt)!.slice(0, 10) >= today;
        return (
          <li key={e.slug} className="flex flex-col rounded-lg border border-rule bg-surface p-6">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-serif text-xl leading-snug text-ink [text-wrap:pretty]">{e.title}</h3>
              <span className={cn("mt-1 inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-medium", upcoming ? "bg-success-wash text-success" : "bg-muted text-muted-ink")}>
                {!day ? "Coming Soon" : upcoming ? "Upcoming" : "Held"}
              </span>
            </div>
            {e.summary && <p className="mt-2 line-clamp-4 text-[0.9375rem] leading-relaxed text-muted-ink">{e.summary}</p>}
            <ul className="mt-4 space-y-1.5 text-sm text-ink/85">
              <li className="flex items-start gap-2">
                <CalendarDays className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
                {e.scheduleNote ?? (day ? <time dateTime={day}>{dateFmt.format(new Date(e.startsAt!))}</time> : "To be announced")}
              </li>
              {e.location && (
                <li className="flex items-start gap-2">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
                  {e.location}
                </li>
              )}
              <li className="flex items-center gap-2">
                <Users className="size-4 shrink-0 text-brand" aria-hidden />
                {MODE[e.mode] ?? e.mode}
              </li>
              <li className="flex items-center gap-2">
                <Ticket className="size-4 shrink-0 text-brand" aria-hidden />
                Fee: {e.fee > 0 ? `${e.currency} ${e.fee.toLocaleString("en-GB")}` : "Free"}
              </li>
            </ul>
          </li>
        );
      })}
    </ul>
  );
}
