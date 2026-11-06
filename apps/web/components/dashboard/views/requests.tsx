"use client";

import { useState } from "react";
import { RichContent } from "@/components/page/rich-text";
import Link from "next/link";
import { Check, Mail, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminPage, Badge, Empty, ErrorNote, Loading, Pager, Panel, Tabs, fmtDate, statusTone, useToast } from "@/components/admin/ui";
import { RichTextArea } from "@/components/admin/form";
import { EditDialog } from "@/components/admin/views/library";
import { Avatar, useMember } from "@/components/dashboard/shell";
import { qs, send, useApi, type Paged } from "@/lib/admin/use-api";
import { useUrlState } from "@/lib/admin/url-state";
import { routes } from "@/lib/site";
import { cn } from "@/lib/utils";

export interface RequestRow {
  id: string;
  kind: "mentorship" | "course" | "funding";
  status: "pending" | "accepted" | "declined" | "withdrawn";
  message: string;
  reply: string | null;
  createdAt: string;
  respondedAt: string | null;
  subject: string | null;
  person: {
    id: string;
    name: string;
    email: string | null;
    type: "mentor" | "mentee" | null;
    slug: string | null;
    position: string | null;
    affiliation: string | null;
    photoUrl: string | null;
    /** The sender's profile, on requests you received. */
    profile?: { bio: string; researchField: string | null; links: Record<string, string>; projects: { title: string; topic?: string; year?: string }[]; expertise: string[] };
  };
}

export const REQUEST_KIND: Record<RequestRow["kind"], string> = { mentorship: "Mentorship", course: "Course", funding: "Funding application" };
const LINK_NAMES: Record<string, string> = { scholar: "Google Scholar", orcid: "ORCID", scopus: "Scopus", researchgate: "ResearchGate", website: "Website", linkedin: "LinkedIn" };

function About({ name, profile }: { name: string; profile: NonNullable<RequestRow["person"]["profile"]> }) {
  const links = Object.entries(profile.links).filter(([k, v]) => v && LINK_NAMES[k]);
  const empty = !profile.bio && !profile.researchField && !links.length && !profile.projects.length && !profile.expertise.length;
  return (
    <details className="group mt-2">
      <summary className="inline-flex min-h-9 cursor-pointer items-center text-sm font-medium text-brand underline-offset-4 hover:underline">About {name.split(" ")[0]}</summary>
      <div className="mt-2 space-y-3 rounded-md border border-rule p-3 text-sm">
        {empty && <p className="text-muted-ink">They have not filled in their profile yet.</p>}
        {profile.researchField && (
          <p>
            <span className="text-faint-ink">Field: </span>
            {profile.researchField}
          </p>
        )}
        {profile.expertise.length > 0 && (
          <p>
            <span className="text-faint-ink">Interests: </span>
            {profile.expertise.join(", ")}
          </p>
        )}
        {profile.bio && <RichContent value={profile.bio} compact className="text-ink/85" />}
        {profile.projects.length > 0 && (
          <div>
            <p className="text-faint-ink">Projects</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5">
              {profile.projects.map((p, i) => (
                <li key={i}>{[p.title, p.topic, p.year].filter(Boolean).join(" · ")}</li>
              ))}
            </ul>
          </div>
        )}
        {links.length > 0 && (
          <p className="flex flex-wrap gap-x-4 gap-y-1">
            {links.map(([k, v]) => (
              <a key={k} href={v} target="_blank" rel="noopener noreferrer nofollow" className="text-brand underline-offset-4 hover:underline">
                {LINK_NAMES[k]}
              </a>
            ))}
          </p>
        )}
      </div>
    </details>
  );
}

const STATUS_TEXT: Record<RequestRow["status"], string> = { pending: "Waiting", accepted: "Accepted", declined: "Declined", withdrawn: "Withdrawn" };

type Action = { row: RequestRow; status: "accepted" | "declined" | "withdrawn" };

export function RequestsView() {
  const { refreshCounts } = useMember();
  const toast = useToast();
  const url = useUrlState();
  const box = url.get("box") === "out" ? "out" : "in";
  const status = url.get("status");
  const list = useApi<Paged<RequestRow>>(`/me/workspace/requests${qs({ box, status, page: url.page, pageSize: 20 })}`);
  const [action, setAction] = useState<Action | null>(null);
  const [reply, setReply] = useState("");
  const [saving, setSaving] = useState(false);

  async function act() {
    if (!action) return;
    setSaving(true);
    const res = await send(`/me/workspace/requests/${action.row.id}`, "PATCH", { status: action.status, ...(reply.trim() ? { reply } : {}) });
    setSaving(false);
    if (!res.ok) return toast("error", res.message);
    const done = { accepted: "Request accepted. We have let them know.", declined: action.row.status === "accepted" ? "Ended. We have let them know." : "Request declined. We have let them know.", withdrawn: "Request withdrawn." };
    toast("success", done[action.status]);
    setAction(null);
    void list.reload();
    refreshCounts();
  }

  const open = (row: RequestRow, s: Action["status"]) => {
    setReply("");
    setAction({ row, status: s });
  };

  const dialogTitle = action
    ? action.status === "accepted"
      ? `Accept ${action.row.person.name}?`
      : action.status === "withdrawn"
        ? "Withdraw your request?"
        : action.row.status === "accepted"
          ? `End ${action.row.kind === "mentorship" ? "mentorship" : "this"} with ${action.row.person.name}?`
          : `Decline ${action.row.person.name}?`
    : "";

  return (
    <AdminPage title="Requests" description="Mentorship requests, course requests and funding applications. Accept or decline the ones sent to you, and follow the ones you sent.">
      <Tabs
        label="Requests"
        tabs={[
          ["in", "Received"],
          ["out", "Sent"],
        ]}
        value={box}
        onChange={(v) => url.set({ box: v === "in" ? "" : v, status: "" })}
      />
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by status">
        {[
          ["", "All"],
          ["pending", "Waiting"],
          ["accepted", "Accepted"],
          ["declined", "Declined"],
        ].map(([v, l]) => (
          <button
            key={v}
            type="button"
            aria-pressed={status === v}
            onClick={() => url.set({ status: v })}
            className={cn("min-h-11 rounded-full border px-4 text-sm transition-colors md:min-h-9", status === v ? "border-brand bg-brand text-white" : "border-rule bg-surface text-ink hover:border-brand-tint")}
          >
            {l}
          </button>
        ))}
      </div>

      <Panel>
        {list.error && <ErrorNote message={list.error.message} onRetry={list.reload} />}
        {!list.data && !list.error && <Loading />}
        {list.data && list.data.items.length === 0 && (
          <Empty
            title={status ? "Nothing here" : box === "in" ? "No requests yet" : "You have not sent any requests"}
            text={box === "in" ? "When someone asks for mentorship, a place on your course or applies for your funding call, it appears here and we email you." : "Ask a mentor for mentorship from their profile, or apply for a funding call."}
            action={
              box === "out" ? (
                <Button asChild variant="outline">
                  <Link href={routes.mentorship}>Browse Mentors</Link>
                </Button>
              ) : undefined
            }
          />
        )}
        {list.data && list.data.items.length > 0 && (
          <>
            <ul className="-my-2 divide-y divide-rule">
              {list.data.items.map((r) => (
                <li key={r.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start">
                  <div className="flex min-w-0 flex-1 gap-3">
                    <Avatar name={r.person.name} src={r.person.photoUrl} className="size-11 text-sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        {r.person.slug ? (
                          <Link href={routes.mentor(r.person.slug)} target="_blank" rel="noopener" className="font-medium text-ink underline-offset-4 hover:text-brand hover:underline">
                            {r.person.name}
                          </Link>
                        ) : (
                          <span className="font-medium text-ink">{r.person.name}</span>
                        )}
                        <Badge tone={statusTone(r.status)}>{STATUS_TEXT[r.status]}</Badge>
                      </div>
                      {(r.person.position || r.person.affiliation) && <p className="text-sm text-muted-ink">{[r.person.position, r.person.affiliation].filter(Boolean).join(", ")}</p>}
                      <p className="mt-2 text-sm text-ink">
                        <span className="font-medium">{REQUEST_KIND[r.kind]}</span>
                        {r.subject ? `: ${r.subject}` : ""} · <span className="text-faint-ink">{fmtDate(r.createdAt)}</span>
                      </p>
                      {r.message && <RichContent value={r.message} compact className="mt-1.5 rounded-md bg-paper px-3 py-2 text-sm text-ink/85" />}
                      {r.reply && (
                        <div className="mt-1.5 text-sm text-muted-ink">
                          <span className="font-medium text-ink">{box === "in" ? "Your reply" : "Reply"}:</span>
                          <RichContent value={r.reply} compact className="mt-0.5" />
                        </div>
                      )}
                      {r.person.profile && r.person.type === "mentee" && <About name={r.person.name} profile={r.person.profile} />}
                      {r.person.email && (
                        <a href={`mailto:${r.person.email}`} className="mt-1.5 inline-flex min-h-9 items-center gap-1.5 text-sm text-brand underline-offset-4 hover:underline">
                          <Mail className="size-4" aria-hidden /> {r.person.email}
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 sm:shrink-0 sm:justify-end">
                    {box === "in" && r.status === "pending" && (
                      <>
                        <Button size="sm" onClick={() => open(r, "accepted")}>
                          <Check aria-hidden /> Accept
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => open(r, "declined")}>
                          <X aria-hidden /> Decline
                        </Button>
                      </>
                    )}
                    {box === "in" && r.status === "accepted" && (
                      <>
                        {r.kind === "mentorship" && (
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/dashboard/messages?to=${r.person.id}`}>
                              <Mail aria-hidden /> Message
                            </Link>
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => open(r, "declined")}>
                          End
                        </Button>
                      </>
                    )}
                    {box === "out" && (r.status === "pending" || r.status === "accepted") && (
                      <Button size="sm" variant="outline" onClick={() => open(r, "withdrawn")}>
                        Withdraw
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            <Pager page={list.data.page} pages={list.data.pages} total={list.data.total} onPage={(p) => url.set({ page: p })} />
          </>
        )}
      </Panel>

      <EditDialog
        open={!!action}
        onOpenChange={(v) => !v && setAction(null)}
        title={dialogTitle}
        description={
          action?.status === "accepted"
            ? "They receive an email, and you will both see each other's email address so you can arrange the next step."
            : action?.status === "withdrawn"
              ? "The other member will no longer see it as waiting."
              : "They receive an email letting them know. Adding a short reason is kind."
        }
        saving={saving}
        onSave={act}
        saveLabel={action?.status === "accepted" ? "Accept" : action?.status === "withdrawn" ? "Withdraw" : action?.row.status === "accepted" ? "End" : "Decline"}
        savingLabel="Saving…"
      >
        {action && action.status !== "withdrawn" && <RichTextArea id="reply" label="Message to them (optional)" value={reply} onChange={setReply} rows={4} max={2000} hint={action.status === "accepted" ? "For example, when and how you would like to meet." : undefined} />}
        {action?.status === "withdrawn" && <p className="text-sm text-muted-ink">You can send a new request later if you change your mind.</p>}
      </EditDialog>
    </AdminPage>
  );
}
