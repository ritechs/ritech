"use client";

import Link from "next/link";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminPage, Empty, ErrorNote, Loading, Panel, fmtDate } from "@/components/admin/ui";
import { Avatar } from "@/components/dashboard/shell";
import type { RequestRow } from "@/components/dashboard/views/requests";
import { useApi, type Paged } from "@/lib/admin/use-api";
import { routes } from "@/lib/site";

interface Person {
  id: string;
  name: string;
  type: "mentor" | "mentee";
  slug: string | null;
  position: string | null;
  affiliation: string | null;
  country: string | null;
  email: string | null;
  photoUrl: string | null;
  shared?: number;
}
interface Data {
  type: "mentor" | "mentee";
  connected: Person[];
  similarMentors: Person[];
  similarMentees: Person[];
}

function PersonCard({ p, connected }: { p: Person; connected?: boolean }) {
  return (
    <li className="flex min-w-0 items-start gap-3 rounded-lg border border-rule p-4">
      <Avatar name={p.name} src={p.photoUrl} className="size-12 text-base" />
      <div className="min-w-0 flex-1">
        {p.slug ? (
          <Link href={routes.mentor(p.slug)} target="_blank" rel="noopener" className="font-medium text-ink underline-offset-4 hover:text-brand hover:underline">
            {p.name}
          </Link>
        ) : (
          <p className="font-medium text-ink">{p.name}</p>
        )}
        <p className="text-sm text-muted-ink">{[p.position, p.affiliation].filter(Boolean).join(", ")}</p>
        {p.shared ? (
          <p className="mt-1 text-xs text-faint-ink">
            {p.shared} shared {p.shared === 1 ? "area" : "areas"} of expertise
          </p>
        ) : null}
        {!connected && p.slug && (
          <Button asChild size="sm" variant="outline" className="mt-2">
            <Link href={routes.mentor(p.slug)} target="_blank" rel="noopener">
              View Profile
            </Link>
          </Button>
        )}
        {connected && (
          <div className="mt-2 flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href={`/dashboard/messages?to=${p.id}`}>
                <Mail aria-hidden /> Message
              </Link>
            </Button>
            {p.email && (
              <Button asChild size="sm" variant="ghost">
                <a href={`mailto:${p.email}`}>Email</a>
              </Button>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

function Grid({ people, connected }: { people: Person[]; connected?: boolean }) {
  return (
    <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {people.map((p) => (
        <PersonCard key={p.id} p={p} connected={connected} />
      ))}
    </ul>
  );
}

function Waiting() {
  const { data } = useApi<Paged<RequestRow>>("/me/workspace/requests?box=out&status=pending&pageSize=20");
  const rows = (data?.items ?? []).filter((r) => r.kind === "mentorship");
  if (!rows.length) return null;
  return (
    <Panel title={`Waiting for a Reply (${rows.length})`}>
      <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((r) => (
          <li key={r.id} className="flex min-w-0 items-start gap-3 rounded-lg border border-dashed border-rule-strong p-4">
            <Avatar name={r.person.name} src={r.person.photoUrl} className="size-12 text-base" />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-ink">{r.person.name}</p>
              <p className="text-sm text-muted-ink">{[r.person.position, r.person.affiliation].filter(Boolean).join(", ")}</p>
              <p className="mt-1 text-xs text-faint-ink">Asked on {fmtDate(r.createdAt)}</p>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm text-muted-ink">
        We email you when they reply. You can withdraw a request under{" "}
        <Link href="/dashboard/requests?box=out" className="text-brand underline-offset-4 hover:underline">
          My Requests
        </Link>
        .
      </p>
    </Panel>
  );
}

export function PeopleView() {
  const { data, error, reload } = useApi<Data>("/me/workspace/connections");
  const mentor = data?.type === "mentor";
  return (
    <AdminPage
      title={data ? (mentor ? "My Mentees" : "My Mentors") : "People"}
      description={mentor ? "Mentees you have accepted, and members who share your research interests." : "Mentors who have accepted you, and members who share your research interests."}
    >
      {error && <ErrorNote message={error.message} onRetry={reload} />}
      {!data && !error && <Loading />}
      {data && (
        <>
          <Panel title={mentor ? `Connected Mentees (${data.connected.length})` : `My Mentors (${data.connected.length})`}>
            {data.connected.length === 0 ? (
              <Empty
                title={mentor ? "No mentees yet" : "No mentors yet"}
                text={mentor ? "When you accept a mentorship request, the mentee appears here." : "Find a mentor in the directory and send a mentorship request from their profile."}
                action={
                  mentor ? (
                    <Button asChild variant="outline">
                      <Link href="/dashboard/requests">Open Requests</Link>
                    </Button>
                  ) : (
                    <Button asChild>
                      <Link href={routes.mentorship}>Find a Mentor</Link>
                    </Button>
                  )
                }
              />
            ) : (
              <Grid people={data.connected} connected />
            )}
          </Panel>
          {!mentor && <Waiting />}
          <Panel
            title={mentor ? "Similar Mentors" : "Suggested Mentors"}
            actions={
              !mentor ? (
                <Button asChild variant="ghost" size="sm">
                  <Link href={routes.mentorship}>Browse All Mentors</Link>
                </Button>
              ) : undefined
            }
          >
            {data.similarMentors.length === 0 ? (
              <p className="text-sm text-muted-ink">
                No mentors share your areas of expertise yet.{" "}
                <Link href="/dashboard/expertise" className="text-brand underline-offset-4 hover:underline">
                  Add more areas
                </Link>{" "}
                to widen the match.
              </p>
            ) : (
              <>
                {!mentor && <p className="-mt-1 mb-4 text-sm text-muted-ink">Mentors who share your areas of expertise. Open a profile to send a mentorship request.</p>}
                <Grid people={data.similarMentors} />
              </>
            )}
          </Panel>
          {mentor && (
            <Panel title="Similar Mentees">
              {data.similarMentees.length === 0 ? <p className="text-sm text-muted-ink">No mentees share your areas of expertise yet.</p> : <Grid people={data.similarMentees} />}
            </Panel>
          )}
        </>
      )}
    </AdminPage>
  );
}
