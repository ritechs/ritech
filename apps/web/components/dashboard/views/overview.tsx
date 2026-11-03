"use client";

import Link from "next/link";
import { ArrowRight, BookOpenCheck, GraduationCap, CircleCheck, Circle, FolderKanban, Inbox, Library, Mail, UserRound, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminPage, Badge, ErrorNote, Loading, Panel, fmtDate, statusTone } from "@/components/admin/ui";
import { Avatar, isMentor, useMember } from "@/components/dashboard/shell";
import { REQUEST_KIND, type RequestRow } from "@/components/dashboard/views/requests";
import { useApi } from "@/lib/admin/use-api";
import { routes } from "@/lib/site";
import { cn } from "@/lib/utils";

interface Overview {
  checklist: { key: string; label: string; done: boolean; href: string }[];
  completeness: number;
  counts: { connections: number; pendingRequests: number; unreadMessages: number; sentPending: number; expertise: number; projects: number; courses: number; resources: number; funding: number };
  recentRequests: RequestRow[];
}

function Stat({ href, icon: Icon, value, label, note }: { href: string; icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>; value: number; label: string; note?: string }) {
  return (
    <Link href={href} className="group flex min-w-0 flex-col items-start gap-3 rounded-lg border border-rule bg-surface p-4 sm:flex-row transition-colors hover:border-brand-tint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:p-5">
      <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-md bg-brand-wash text-brand">
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block font-serif text-3xl leading-none text-ink numerals-tabular">{value}</span>
        <span className="mt-1.5 block text-sm text-muted-ink group-hover:text-ink">{label}</span>
        {note && <span className="mt-0.5 block text-xs font-medium text-brand">{note}</span>}
      </span>
    </Link>
  );
}

export function OverviewView() {
  const { me } = useMember();
  const mentor = isMentor(me);
  const { data, error, reload } = useApi<Overview>("/me/workspace");
  const first = me.profile.firstName || me.user.name.split(" ")[0];

  return (
    <AdminPage
      title={`Welcome, ${first}`}
      description={mentor ? "Keep your mentor profile up to date, answer requests from mentees and share what you offer." : "Keep your profile up to date, find a mentor and follow your requests."}
      actions={
        mentor && me.profile.status === "approved" ? (
          <Button asChild variant="outline">
            <Link href={routes.mentor(me.profile.slug)} target="_blank" rel="noopener">
              View My Public Profile
            </Link>
          </Button>
        ) : !mentor ? (
          <Button asChild>
            <Link href={routes.mentorship}>Find a Mentor</Link>
          </Button>
        ) : undefined
      }
    >
      {error && <ErrorNote message={error.message} onRetry={reload} />}
      {!data && !error && <Loading />}
      {data && (
        <>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <Stat href="/dashboard/people" icon={Users} value={data.counts.connections} label={mentor ? "Connected mentees" : "My mentors"} />
            {mentor ? (
              <Stat href="/dashboard/requests" icon={Inbox} value={data.counts.pendingRequests} label="Requests waiting for you" note={data.counts.pendingRequests ? "Reply now" : undefined} />
            ) : (
              <Stat href="/dashboard/requests?box=out" icon={Inbox} value={data.counts.sentPending} label="Requests awaiting reply" />
            )}
            <Stat href="/dashboard/messages" icon={Mail} value={data.counts.unreadMessages} label="Unread messages" />
            {mentor ? <Stat href="/dashboard/courses" icon={BookOpenCheck} value={data.counts.courses} label="Courses offered" /> : <Stat href="/dashboard/projects" icon={FolderKanban} value={data.counts.projects} label="Projects listed" />}
          </div>

          <div className="grid gap-6 lg:grid-cols-5">
            <Panel title="Profile Strength" className="lg:col-span-2">
              <div className="flex items-end justify-between gap-3">
                <p className="font-serif text-4xl text-ink numerals-tabular">{data.completeness}%</p>
                <p className="text-sm text-muted-ink">{data.completeness === 100 ? "Your profile is complete." : "Complete profiles get more requests."}</p>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-paper" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={data.completeness} aria-label="Profile completeness">
                <div className="h-full rounded-full bg-brand transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${data.completeness}%` }} />
              </div>
              <ul className="mt-5 space-y-1">
                {data.checklist.map((c) => (
                  <li key={c.key}>
                    <Link href={c.href} className={cn("flex min-h-10 items-center gap-2.5 rounded-md px-2 text-sm transition-colors hover:bg-paper", c.done ? "text-muted-ink" : "text-ink")}>
                      {c.done ? <CircleCheck className="size-4 shrink-0 text-success" aria-hidden /> : <Circle className="size-4 shrink-0 text-faint-ink" aria-hidden />}
                      <span className={cn("flex-1", c.done && "line-through decoration-rule-strong")}>{c.label}</span>
                      <span className="sr-only">{c.done ? "(done)" : "(to do)"}</span>
                      {!c.done && <ArrowRight className="size-4 text-brand" aria-hidden />}
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>

            <Panel
              title={mentor ? "Latest Requests" : "My Latest Requests"}
              className="lg:col-span-3"
              actions={
                <Button asChild variant="ghost" size="sm">
                  <Link href={mentor ? "/dashboard/requests" : "/dashboard/requests?box=out"}>
                    See All <ArrowRight aria-hidden />
                  </Link>
                </Button>
              }
            >
              {data.recentRequests.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-ink">{mentor ? "No requests yet. Mentees can ask you for mentorship or to join your courses from your public profile." : "You have not asked a mentor yet. Browse the mentor directory and send a request from a mentor's profile."}</p>
              ) : (
                <ul className="-my-2 divide-y divide-rule">
                  {data.recentRequests.map((r) => (
                    <li key={r.id} className="flex items-start gap-3 py-3">
                      <Avatar name={r.person.name} src={r.person.photoUrl} className="size-10 text-sm" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-ink">
                          <span className="font-medium">{r.person.name}</span> · {REQUEST_KIND[r.kind]}
                          {r.subject ? `: ${r.subject}` : ""}
                        </p>
                        {r.message && <p className="mt-0.5 line-clamp-2 text-sm text-muted-ink">{r.message}</p>}
                        <p className="mt-1 text-xs text-faint-ink">{fmtDate(r.createdAt)}</p>
                      </div>
                      <Badge tone={statusTone(r.status)}>{r.status === "pending" ? "Waiting" : r.status[0]!.toUpperCase() + r.status.slice(1)}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>

          <Panel title="Quick Actions">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ...(mentor
                  ? [
                      { href: "/dashboard/profile", label: "Edit my profile", icon: UserRound },
                      { href: "/dashboard/projects", label: "Add a research project", icon: FolderKanban },
                      { href: "/dashboard/courses", label: "Offer a course", icon: BookOpenCheck },
                      { href: "/dashboard/resources", label: "Share a resource", icon: Library },
                    ]
                  : [
                      { href: routes.mentorship, label: "Find a mentor", icon: Users },
                      { href: "/dashboard/biography", label: "Write my biography", icon: UserRound },
                      { href: "/dashboard/scholar", label: "Add my Scholar ID", icon: GraduationCap },
                      { href: "/dashboard/mail", label: "Mail the RiTECHS team", icon: Mail },
                    ]),
              ].map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href} className="flex min-h-12 items-center gap-3 rounded-md border border-rule px-3 text-sm text-ink transition-colors hover:border-brand-tint hover:bg-brand-wash/40">
                  <Icon className="size-4 text-brand" aria-hidden />
                  {label}
                </Link>
              ))}
            </div>
          </Panel>
        </>
      )}
    </AdminPage>
  );
}
