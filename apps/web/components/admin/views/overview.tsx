"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  CalendarPlus,
  FileText,
  Globe2,
  GraduationCap,
  Inbox,
  MessageSquareText,
  Newspaper,
  Presentation,
  Repeat,
  ShieldAlert,
  Ticket,
  UserCheck,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminPage, Badge, ErrorNote, Loading, Panel, fmtDate, label } from "@/components/admin/ui";
import { useAdmin } from "@/components/admin/shell";
import { useApi, type Paged } from "@/lib/admin/use-api";
import { cn } from "@/lib/utils";

interface Dashboard {
  members: { type: string; status: string; n: number }[];
  pendingMembershipChanges: number;
  registrationsLast30Days: number;
  newQuotes: number;
  newMessages: number;
  subscribers: number;
  conferences: number;
  failedJobs: number;
  totals: {
    upcoming_conferences: number;
    upcoming_events: number;
    events: number;
    registrations: number;
    news: number;
    publications: number;
    speakers: number;
    organisations: number;
    quotes: number;
    quoted_amount: number;
    countries: number;
  };
  signups: { year: number; mentors: number; mentees: number }[];
  topCountries: { country: string; n: number }[];
  upcoming: { kind: "conference" | "event"; id: string; title: string; label: string; starts: string; location: string | null; registrations: number }[];
  recentRegistrations: { id: string; name: string; what: string | null; created_at: string; status: string }[];
}
interface Security {
  active_blocks: number;
  sign_ins_24h: number;
  lockouts_24h: number;
  locked_accounts: number;
  staff_without_2fa: number;
}
interface PendingMember {
  userId: string;
  name: string;
  type: string;
  affiliation: string;
  emailVerified: boolean;
  createdAt: string;
}

const COUNTRY = new Intl.DisplayNames(["en-GB"], { type: "region" });
const num = (n: number) => n.toLocaleString("en-GB");
const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
};

/* --------------------------------- pieces --------------------------------- */

function Kpi({ icon: Icon, label: text, value, sub, href }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; sub?: string; href?: string }) {
  const body = (
    <>
      <div className="flex items-center justify-between">
        <span className="inline-flex size-9 items-center justify-center rounded-md bg-brand-wash text-brand">
          <Icon className="size-4.5" />
        </span>
        {href && <ArrowUpRight className="size-4 text-faint-ink transition-colors group-hover:text-brand" aria-hidden />}
      </div>
      <p className="mt-4 font-serif text-[2rem] leading-none text-ink numerals-tabular">{value}</p>
      <p className="mt-2 text-sm font-medium text-ink">{text}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-ink">{sub}</p>}
    </>
  );
  const cls = "group block rounded-lg border border-rule bg-surface p-5 transition-[border-color,box-shadow]";
  return href ? (
    <Link href={href} className={cn(cls, "hover:border-rule-strong hover:shadow-[0_10px_24px_-18px_rgba(32,33,36,0.35)]")}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** One "needs attention" item; quiet when there is nothing to do. */
function Attention({ icon: Icon, n, text, href }: { icon: React.ComponentType<{ className?: string }>; n: number; text: string; href: string }) {
  const hot = n > 0;
  return (
    <Link
      href={href}
      className={cn(
        "flex min-h-16 items-center gap-3 rounded-lg border px-3.5 py-3 transition-colors sm:px-4",
        hot ? "border-brand-tint bg-brand-wash hover:border-brand/40" : "border-rule bg-surface hover:border-rule-strong",
      )}
    >
      <Icon className={cn("hidden size-5 shrink-0 sm:block", hot ? "text-brand" : "text-faint-ink")} />
      <span className="min-w-0 flex-1">
        <span className={cn("block font-serif text-2xl leading-none numerals-tabular", hot ? "text-brand" : "text-ink")}>{n}</span>
        <span className="mt-1 block text-sm leading-snug text-muted-ink">{text}</span>
      </span>
      <ArrowRight className="hidden size-4 shrink-0 text-faint-ink sm:block" aria-hidden />
    </Link>
  );
}

const SERIES = [
  { key: "mentors", label: "Mentors", cls: "bg-chart-1" },
  { key: "mentees", label: "Mentees", cls: "bg-chart-2" },
] as const;

/** Stacked bars of new member applications per year, with hover values and a table for screen readers. */
function SignupChart({ data }: { data: Dashboard["signups"] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.mentors + d.mentees));
  const total = data.reduce((n, d) => n + d.mentors + d.mentees, 0);
  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted-ink">
        {SERIES.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-2">
            <span aria-hidden className={cn("size-2.5 rounded-sm", s.cls)} />
            {s.label}
          </span>
        ))}
        <span className="ml-auto text-xs text-faint-ink">{num(total)} applications in total</span>
      </div>
      <div aria-hidden className="relative mt-5 h-52">
        {[0.5, 1].map((f) => (
          <div key={f} className="absolute inset-x-0 border-t border-dashed border-rule" style={{ bottom: `${f * 100}%` }}>
            <span className="absolute -top-2.5 right-0 bg-surface pl-1 text-[0.6875rem] text-faint-ink numerals-tabular">{Math.round(max * f)}</span>
          </div>
        ))}
        <div className="absolute inset-0 flex items-end gap-2 border-b border-rule-strong pr-8 sm:gap-4">
          {data.map((d, i) => {
            const all = d.mentors + d.mentees;
            return (
              <div
                key={d.year}
                className="relative flex h-full flex-1 flex-col justify-end"
                onPointerEnter={() => setHover(i)}
                onPointerLeave={() => setHover(null)}
              >
                {hover === i && (
                  <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 w-36 -translate-x-1/2 rounded-md border border-rule bg-surface px-3 py-2 text-xs shadow-[0_10px_24px_-14px_rgba(32,33,36,0.4)]">
                    <p className="font-medium text-ink">{d.year}</p>
                    {SERIES.map((s) => (
                      <p key={s.key} className="mt-1 flex items-center justify-between gap-3 text-muted-ink">
                        <span className="inline-flex items-center gap-1.5">
                          <span className={cn("size-2 rounded-sm", s.cls)} />
                          {s.label}
                        </span>
                        <span className="text-ink numerals-tabular">{d[s.key]}</span>
                      </p>
                    ))}
                  </div>
                )}
                <div className={cn("mx-auto flex w-full max-w-12 flex-col-reverse gap-[2px] transition-opacity", hover !== null && hover !== i && "opacity-60")} style={{ height: `${(all / max) * 100}%` }}>
                  {SERIES.map((s, si) =>
                    d[s.key] > 0 ? (
                      <div key={s.key} className={cn(s.cls, si === SERIES.length - 1 || d[SERIES[si + 1]!.key] === 0 ? "rounded-t-[4px]" : "")} style={{ flexGrow: d[s.key] }} />
                    ) : null,
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div aria-hidden className="mt-2 flex gap-2 pr-8 sm:gap-4">
        {data.map((d) => (
          <span key={d.year} className="flex-1 text-center text-xs text-muted-ink numerals-tabular">
            {d.year}
          </span>
        ))}
      </div>
      <table className="sr-only">
        <caption>Member applications per year</caption>
        <thead>
          <tr>
            <th scope="col">Year</th>
            <th scope="col">Mentors</th>
            <th scope="col">Mentees</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.year}>
              <th scope="row">{d.year}</th>
              <td>{d.mentors}</td>
              <td>{d.mentees}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CountryBars({ rows }: { rows: Dashboard["topCountries"] }) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  return (
    <ul className="space-y-3.5">
      {rows.map((r) => (
        <li key={r.country}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate text-ink">{COUNTRY.of(r.country) ?? r.country}</span>
            <span className="text-muted-ink numerals-tabular">{r.n}</span>
          </div>
          <div aria-hidden className="mt-1.5 h-1.5 rounded-full bg-paper">
            <div className="h-full rounded-full bg-chart-1" style={{ width: `${(r.n / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

const linkCls = "inline-flex min-h-11 items-center gap-1 rounded-sm text-sm font-medium text-brand hover:underline md:min-h-0";

/* ---------------------------------- view ---------------------------------- */

export function OverviewView() {
  const me = useAdmin();
  const dash = useApi<Dashboard>("/admin/dashboard");
  const pending = useApi<Paged<PendingMember>>("/admin/members?status=pending&pageSize=6");
  const sec = useApi<Security>(me.role === "admin" ? "/admin/security/overview" : null);
  const [hello] = useState(greeting);

  const d = dash.data;
  const count = (type: string, status: string) => d?.members.find((m) => m.type === type && m.status === status)?.n ?? 0;
  const pendingMembers = count("mentor", "pending") + count("mentee", "pending");

  return (
    <AdminPage
      title={`${hello}, ${me.name.split(" ")[0]}`}
      description="Members, programme and enquiries at a glance."
      actions={
        <>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/news/new">
              <Newspaper aria-hidden /> New Article
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/events/new">
              <CalendarPlus aria-hidden /> New Event
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/admin/conferences/new">
              <Presentation aria-hidden /> New Conference
            </Link>
          </Button>
        </>
      }
    >
      {dash.error && <ErrorNote message={dash.error.message} onRetry={dash.reload} />}
      {!d && !dash.error && <Loading label="Loading the dashboard…" />}
      {d && (
        <>
          <section aria-label="Needs attention" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <Attention icon={UserCheck} n={pendingMembers} text="Applications to review" href="/admin/members?status=pending" />
            <Attention icon={Repeat} n={d.pendingMembershipChanges} text="Membership type changes" href="/admin/members?tab=changes" />
            <Attention icon={MessageSquareText} n={d.newMessages} text="New contact messages" href="/admin/inbox?tab=messages" />
            <Attention icon={FileText} n={d.newQuotes} text="New quote requests" href="/admin/inbox?tab=quotes" />
          </section>

          <section aria-label="Key figures" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi icon={GraduationCap} label="Mentors" value={num(count("mentor", "approved"))} sub={`${count("mentor", "pending")} waiting for review`} href="/admin/members?type=mentor&status=approved" />
            <Kpi icon={Users} label="Mentees" value={num(count("mentee", "approved"))} sub={`${count("mentee", "pending")} waiting for review`} href="/admin/members?type=mentee&status=approved" />
            <Kpi icon={Presentation} label="Conferences" value={num(d.conferences)} sub={`${d.totals.upcoming_conferences} upcoming`} href="/admin/conferences" />
            <Kpi icon={Ticket} label="Registrations" value={num(d.totals.registrations)} sub={`${d.registrationsLast30Days} in the last 30 days`} href="/admin/registrations" />
          </section>

          <div className="grid gap-6 xl:grid-cols-3">
            <Panel title="Member Applications per Year" className="xl:col-span-2">
              {d.signups.length ? <SignupChart data={d.signups} /> : <p className="text-sm text-muted-ink">No members yet.</p>}
            </Panel>
            <Panel title="Where Members Are">
              {d.topCountries.length ? <CountryBars rows={d.topCountries} /> : <p className="text-sm text-muted-ink">No countries recorded yet.</p>}
              <p className="mt-5 flex items-center gap-2 border-t border-rule pt-4 text-sm text-muted-ink">
                <Globe2 className="size-4 text-faint-ink" aria-hidden />
                {d.totals.countries} countries in total
              </p>
            </Panel>
          </div>

          <div className="grid items-start gap-6 lg:grid-cols-2">
            <Panel
              title="Coming Up"
              actions={
                <Link href="/admin/conferences" className={linkCls}>
                  Programme <ArrowRight className="size-4" aria-hidden />
                </Link>
              }
            >
              {d.upcoming.length === 0 ? (
                <p className="text-sm text-muted-ink">Nothing is scheduled. Add a conference or event to see it here.</p>
              ) : (
                <ul className="-my-3 divide-y divide-rule">
                  {d.upcoming.map((u) => {
                    const date = new Date(`${u.starts}T12:00:00Z`);
                    return (
                      <li key={`${u.kind}-${u.id}`}>
                        <Link href={`/admin/${u.kind === "conference" ? "conferences" : "events"}/${u.id}`} className="group flex items-center gap-4 py-3">
                          <span className="flex w-12 shrink-0 flex-col items-center rounded-md border border-rule bg-paper py-1.5 leading-none">
                            <span className="text-[0.6875rem] font-medium text-brand uppercase">{date.toLocaleString("en-GB", { month: "short", timeZone: "UTC" })}</span>
                            <span className="mt-1 font-serif text-xl text-ink numerals-tabular">{date.getUTCDate()}</span>
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium text-ink group-hover:text-brand">{u.kind === "conference" ? u.label : u.title}</span>
                            <span className="block truncate text-sm text-muted-ink">
                              {u.kind === "conference" ? "Conference" : label(u.label)}
                              {u.location ? ` · ${u.location}` : ""}
                            </span>
                          </span>
                          <span className="shrink-0 text-right text-xs text-muted-ink">
                            <span className="block font-serif text-lg text-ink numerals-tabular">{u.registrations}</span>
                            registered
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>

            <Panel
              title="Latest Registrations"
              actions={
                <Link href="/admin/registrations" className={linkCls}>
                  All registrations <ArrowRight className="size-4" aria-hidden />
                </Link>
              }
            >
              {d.recentRegistrations.length === 0 ? (
                <p className="text-sm text-muted-ink">No registrations yet.</p>
              ) : (
                <ul className="-my-3 divide-y divide-rule">
                  {d.recentRegistrations.map((r) => (
                    <li key={r.id} className="flex items-center gap-3 py-3">
                      <CalendarDays className="size-4 shrink-0 text-faint-ink" aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-ink">{r.name}</span>
                        <span className="block truncate text-xs text-muted-ink">{r.what ?? "Event"}</span>
                      </span>
                      <span className="hidden shrink-0 text-xs text-faint-ink sm:block">{fmtDate(r.created_at)}</span>
                      <Badge tone={r.status === "confirmed" ? "success" : r.status === "cancelled" ? "danger" : "warning"}>{label(r.status)}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </>
      )}

      <Panel
        title="Applications Waiting for Review"
        actions={
          <Link href="/admin/members?status=pending" className={linkCls}>
            Review all <ArrowRight className="size-4" aria-hidden />
          </Link>
        }
      >
        {pending.error && <ErrorNote message={pending.error.message} onRetry={pending.reload} />}
        {!pending.data && !pending.error && <Loading />}
        {pending.data && pending.data.items.length === 0 && <p className="text-sm text-muted-ink">No applications are waiting.</p>}
        {pending.data && pending.data.items.length > 0 && (
          <ul className="-my-3 divide-y divide-rule">
            {pending.data.items.map((m) => (
              <li key={m.userId}>
                <Link href={`/admin/members/${m.userId}`} className="group flex flex-wrap items-center gap-x-4 gap-y-1 py-3">
                  <span className="min-w-0 flex-1 basis-48">
                    <span className="block truncate font-medium text-ink group-hover:text-brand">{m.name}</span>
                    <span className="block truncate text-sm text-muted-ink">{m.affiliation || "No affiliation given"}</span>
                  </span>
                  <Badge tone="brand">{label(m.type)}</Badge>
                  {m.emailVerified ? <Badge tone="success">Email confirmed</Badge> : <Badge tone="warning">Email not confirmed</Badge>}
                  <span className="w-24 text-right text-xs text-faint-ink">{fmtDate(m.createdAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {d && (
        <section aria-label="Content and enquiries" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {[
            { label: "Events", value: d.totals.events, sub: `${d.totals.upcoming_events} upcoming`, href: "/admin/events" },
            { label: "News articles", value: d.totals.news, href: "/admin/news" },
            { label: "Publications", value: d.totals.publications, href: "/admin/publications" },
            { label: "Speakers", value: d.totals.speakers, href: "/admin/speakers" },
            { label: "Sponsors & partners", value: d.totals.organisations, href: "/admin/organisations" },
            { label: "Newsletter subscribers", value: d.subscribers, href: "/admin/inbox?tab=subscribers" },
          ].map((s) => (
            <Link key={s.label} href={s.href} className="rounded-lg border border-rule bg-surface px-4 py-3.5 transition-colors hover:border-rule-strong">
              <p className="font-serif text-2xl leading-none text-ink numerals-tabular">{num(s.value)}</p>
              <p className="mt-1.5 text-sm text-muted-ink">{s.label}</p>
              {s.sub && <p className="text-xs text-faint-ink">{s.sub}</p>}
            </Link>
          ))}
        </section>
      )}

      {me.role === "admin" && sec.data && (
        <Panel
          title="Security"
          actions={
            <Link href="/admin/security" className={linkCls}>
              Security console <ArrowRight className="size-4" aria-hidden />
            </Link>
          }
        >
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-4">
            {[
              { k: "Sign-ins in 24 hours", v: sec.data.sign_ins_24h },
              { k: "Lockouts in 24 hours", v: sec.data.lockouts_24h, warn: sec.data.lockouts_24h > 0 },
              { k: "Blocked addresses", v: sec.data.active_blocks },
              { k: "Admins without two-step verification", v: sec.data.staff_without_2fa },
            ].map((x) => (
              <div key={x.k}>
                <dt className="flex items-center gap-1.5 text-sm text-muted-ink">
                  {x.warn && <ShieldAlert className="size-4 text-warning" aria-hidden />}
                  {x.k}
                </dt>
                <dd className={cn("mt-1 font-serif text-2xl numerals-tabular", x.warn ? "text-warning" : "text-ink")}>{x.v}</dd>
              </div>
            ))}
          </dl>
        </Panel>
      )}

      {d && d.failedJobs > 0 && (
        <ErrorNote message={`${d.failedJobs} background job(s) failed permanently (usually emails). Check the SMTP settings and the API logs.`} />
      )}
      {d && (d.newMessages > 0 || d.newQuotes > 0) && (
        <p className="flex items-center gap-2 text-sm text-muted-ink">
          <Inbox className="size-4" aria-hidden /> {d.totals.quotes} quote requests in total, quoted value {num(Math.round(d.totals.quoted_amount))}.
        </p>
      )}
    </AdminPage>
  );
}
