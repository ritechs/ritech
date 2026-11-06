"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { richToPlainText } from "@ritechs/shared";
import { RichTextArea } from "@/components/admin/form";
import { RichContent } from "@/components/page/rich-text";
import { useAdmin } from "@/components/admin/shell";
import { AdminPage, Badge, Confirm, DataTable, Empty, ErrorNote, Labeled, Loading, Pager, Panel, fmtDate, label, statusTone, useToast } from "@/components/admin/ui";
import { qs, send, useApi, type Paged } from "@/lib/admin/use-api";
import { useUrlState } from "@/lib/admin/url-state";
import { routes } from "@/lib/site";

interface MemberRow {
  userId: string;
  slug: string;
  type: "mentor" | "mentee";
  status: string;
  name: string;
  email: string;
  emailVerified: boolean;
  banned: boolean | null;
  affiliation: string;
  country: string | null;
  featured: boolean;
  createdAt: string;
}
interface ChangeRow {
  id: string;
  userId: string;
  name: string;
  email: string;
  fromType: string;
  toType: string;
  reason: string;
  status: string;
  createdAt: string;
}

function Tabs({ tab, onTab }: { tab: string; onTab: (t: string) => void }) {
  const tabs = [
    ["members", "Members"],
    ["changes", "Type Change Requests"],
  ] as const;
  return (
    <div role="tablist" aria-label="Members" className="flex gap-1 border-b border-rule">
      {tabs.map(([id, text]) => (
        <button
          key={id}
          role="tab"
          aria-selected={tab === id}
          onClick={() => onTab(id)}
          className={`-mb-px min-h-11 border-b-2 px-3 text-sm font-medium transition-colors ${tab === id ? "border-brand text-brand" : "border-transparent text-muted-ink hover:text-ink"}`}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

export function MembersView() {
  const url = useUrlState();
  const tab = url.get("tab", "members");
  const [q, setQ] = useState(url.get("q"));
  const path = `/admin/members${qs({ type: url.get("type"), status: url.get("status"), q: url.get("q"), page: url.page, pageSize: 25 })}`;
  const members = useApi<Paged<MemberRow>>(tab === "members" ? path : null);
  const changes = useApi<Paged<ChangeRow>>(tab === "changes" ? `/admin/members/change-requests${qs({ status: url.get("cstatus", "pending"), page: url.page })}` : null);
  const toast = useToast();
  const [selected, setSelected] = useState<string[]>([]);
  const [bulk, setBulk] = useState<"approve" | "reject" | null>(null);
  const [bulkNote, setBulkNote] = useState("");
  const selectable = url.get("status") === "pending";
  const rows = members.data?.items ?? [];
  const allOnPage = rows.length > 0 && rows.every((r) => selected.includes(r.userId));

  return (
    <AdminPage title="Members" description="Review applications, approve mentors and mentees, and manage memberships.">
      <Tabs tab={tab} onTab={(t) => url.set({ tab: t === "members" ? null : t })} />
      {tab === "members" ? (
        <Panel>
          <form
            className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]"
            onSubmit={(e) => {
              e.preventDefault();
              url.set({ q });
            }}
          >
            <label className="sr-only" htmlFor="m-q">
              Search members
            </label>
            <Input id="m-q" type="search" name="q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, email or affiliation…" spellCheck={false} />
            <label className="sr-only" htmlFor="m-type">
              Type
            </label>
            <NativeSelect id="m-type" value={url.get("type")} onChange={(e) => url.set({ type: e.target.value })}>
              <option value="">All types</option>
              <option value="mentor">Mentors</option>
              <option value="mentee">Mentees</option>
            </NativeSelect>
            <label className="sr-only" htmlFor="m-status">
              Status
            </label>
            <NativeSelect id="m-status" value={url.get("status")} onChange={(e) => url.set({ status: e.target.value })}>
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="suspended">Suspended</option>
            </NativeSelect>
            <Button type="submit" variant="outline">
              Search
            </Button>
          </form>
          <div className="mt-5">
            {members.error && <ErrorNote message={members.error.message} onRetry={members.reload} />}
            {members.loading && !members.data && <Loading />}
            {members.data && members.data.items.length === 0 && <Empty title="No members match" text="Try a different search or clear the filters." />}
            {members.data && members.data.items.length > 0 && (
              <>
                {selectable && (
                  <div className="mb-4 flex flex-wrap items-center gap-3 rounded-md border border-rule bg-paper px-4 py-2.5">
                    <label className="flex min-h-11 items-center gap-2.5 text-sm text-ink md:min-h-9">
                      <input type="checkbox" className="size-4 accent-[var(--brand)]" checked={allOnPage} onChange={(e) => setSelected(e.target.checked ? rows.map((r) => r.userId) : [])} />
                      Select all on this page
                    </label>
                    <span className="text-sm text-muted-ink numerals-tabular">{selected.length} selected</span>
                    <div className="ml-auto flex gap-2">
                      <Button size="sm" variant="outline" disabled={!selected.length} onClick={() => { setBulkNote(""); setBulk("reject"); }}>
                        Reject Selected
                      </Button>
                      <Button size="sm" disabled={!selected.length} onClick={() => { setBulkNote(""); setBulk("approve"); }}>
                        Approve Selected
                      </Button>
                    </div>
                  </div>
                )}
                <DataTable
                  caption="Members"
                  rows={members.data.items}
                  rowKey={(r) => r.userId}
                  onRowHref={(r) => `/admin/members/${r.userId}`}
                  linkKey="name"
                  columns={[
                    ...(selectable
                      ? [{
                          key: "sel",
                          header: "Select",
                          className: "w-12",
                          cell: (r: MemberRow) => (
                            <input
                              type="checkbox"
                              aria-label={`Select ${r.name}`}
                              className="size-4 accent-[var(--brand)]"
                              checked={selected.includes(r.userId)}
                              onChange={(e) => setSelected(e.target.checked ? [...selected, r.userId] : selected.filter((x) => x !== r.userId))}
                            />
                          ),
                        }]
                      : []),
                    { key: "name", header: "Name", cell: (r) => r.name },
                    { key: "email", header: "Email", cell: (r) => <span className="break-all text-muted-ink">{r.email}</span>, hideBelow: "lg" },
                    { key: "type", header: "Type", cell: (r) => label(r.type) },
                    {
                      key: "status",
                      header: "Status",
                      cell: (r) => (
                        <span className="flex flex-wrap gap-1">
                          <Badge tone={statusTone(r.status)}>{label(r.status)}</Badge>
                          {!r.emailVerified && <Badge tone="neutral">Email unconfirmed</Badge>}
                          {r.featured && <Badge tone="brand">Featured</Badge>}
                        </span>
                      ),
                    },
                    { key: "aff", header: "Affiliation", cell: (r) => r.affiliation || "—", hideBelow: "md" },
                    { key: "joined", header: "Joined", cell: (r) => fmtDate(r.createdAt), hideBelow: "sm" },
                  ]}
                />
                <Pager page={members.data.page} pages={members.data.pages} total={members.data.total} onPage={(p) => url.set({ page: p })} />
              </>
            )}
          </div>
        </Panel>
      ) : (
        <Panel>
          <div className="max-w-xs">
            <Labeled id="c-status" label="Show">
              <NativeSelect id="c-status" value={url.get("cstatus", "pending")} onChange={(e) => url.set({ cstatus: e.target.value })}>
                <option value="pending">Waiting for review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </NativeSelect>
            </Labeled>
          </div>
          <div className="mt-5">
            {changes.error && <ErrorNote message={changes.error.message} onRetry={changes.reload} />}
            {changes.loading && !changes.data && <Loading />}
            {changes.data && changes.data.items.length === 0 && <Empty title="No requests" text="Members can ask to switch between mentor and mentee from their account." />}
            {changes.data?.items.map((c) => (
              <article key={c.id} className="border-b border-rule py-4 last:border-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link href={`/admin/members/${c.userId}`} className="font-medium text-brand hover:underline">
                    {c.name}
                  </Link>
                  <Badge tone={statusTone(c.status)}>{label(c.status)}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-ink">
                  {label(c.fromType)} → {label(c.toType)} · {fmtDate(c.createdAt)}
                </p>
                <RichContent value={c.reason} compact className="mt-2 max-w-[70ch] text-[0.9375rem] text-ink" />
                {c.status === "pending" && (
                  <div className="mt-3 flex gap-2">
                    {(["approve", "reject"] as const).map((action) => (
                      <Button
                        key={action}
                        size="sm"
                        variant={action === "approve" ? "default" : "outline"}
                        onClick={async () => {
                          const res = await send(`/admin/members/change-requests/${c.id}/review`, "POST", { action });
                          if (res.ok) {
                            toast("success", action === "approve" ? `${c.name} is now a ${c.toType}.` : "Request rejected.");
                            void changes.reload();
                          } else toast("error", res.message);
                        }}
                      >
                        {action === "approve" ? "Approve" : "Reject"}
                      </Button>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        </Panel>
      )}
      {bulk && (
        <Confirm
          open
          onOpenChange={(v) => !v && setBulk(null)}
          title={bulk === "reject" ? `Reject ${selected.length} Application${selected.length === 1 ? "" : "s"}?` : `Approve ${selected.length} Member${selected.length === 1 ? "" : "s"}?`}
          description={bulk === "reject" ? "Each person gets the polite rejection email. Use this to clear spam sign-ups too." : "Each person gets an approval email. Approved mentors appear in the public directory."}
          confirmLabel={bulk === "reject" ? "Reject" : "Approve"}
          pendingLabel={bulk === "reject" ? "Rejecting…" : "Approving…"}
          destructive={bulk === "reject"}
          onConfirm={async () => {
            const res = await send<{ done: number; failed: { userId: string; message: string }[] }>("/admin/members/review-bulk", "POST", { userIds: selected, action: bulk, ...(bulkNote ? { note: bulkNote } : {}) });
            if (!res.ok) {
              toast("error", res.message);
              return true;
            }
            toast(res.data.failed.length ? "error" : "success", `${res.data.done} done${res.data.failed.length ? `, ${res.data.failed.length} not changed (${res.data.failed[0]!.message})` : "."}`);
            setSelected([]);
            void members.reload();
          }}
        >
          {bulk === "reject" && (
            <RichTextArea id="bulk-note" label="Note (optional, included in the email)" value={bulkNote} onChange={setBulkNote} rows={2} max={500} />
          )}
        </Confirm>
      )}
    </AdminPage>
  );
}

/* --------------------------------- detail -------------------------------- */

interface MemberDetail {
  user: { id: string; name: string; email: string; emailVerified: boolean; role: string; twoFactorEnabled: boolean | null; createdAt: string };
  profile: null | {
    type: string;
    status: string;
    slug: string;
    firstName: string;
    lastName: string;
    gender: string | null;
    phoneE164: string | null;
    position: string;
    qualification: string | null;
    affiliation: string;
    country: string | null;
    city: string | null;
    bio: string;
    researchField: string | null;
    links: Record<string, string>;
    membershipLabel: string | null;
    featured: boolean;
    showInDirectory: boolean;
    photoUrl: string | null;
    reviewedAt: string | null;
    reviewNote: string | null;
    legacyId: number | null;
    expertise: { id: string; name: string }[];
  };
  account: { banned: boolean | null; banReason: string | null; lastLoginAt: string | null };
}

type Action = "approve" | "reject" | "suspend" | "reinstate";
const ACTION_TEXT: Record<Action, { title: string; description: string; confirm: string; pending: string; destructive?: boolean }> = {
  approve: { title: "Approve This Member?", description: "They get an email saying they are approved. Approved mentors appear in the public directory.", confirm: "Approve", pending: "Approving…" },
  reject: { title: "Reject This Application?", description: "They get a polite email. Add a note if you want to explain why (it is included in the email).", confirm: "Reject", pending: "Rejecting…", destructive: true },
  suspend: { title: "Suspend This Member?", description: "They are signed out everywhere and cannot sign in until reinstated. The note is kept internally.", confirm: "Suspend", pending: "Suspending…", destructive: true },
  reinstate: { title: "Reinstate This Member?", description: "Their account works again and their membership becomes approved.", confirm: "Reinstate", pending: "Reinstating…" },
};

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="grid gap-1 py-2.5 sm:grid-cols-[10rem_1fr]">
      <dt className="text-sm text-faint-ink">{k}</dt>
      <dd className="text-[0.9375rem] break-words text-ink">{v || "—"}</dd>
    </div>
  );
}

export function MemberDetailView({ userId }: { userId: string }) {
  const me = useAdmin();
  const router = useRouter();
  const toast = useToast();
  const m = useApi<MemberDetail>(`/admin/members/${userId}`);
  const [action, setAction] = useState<Action | null>(null);
  const [note, setNote] = useState("");
  const [del, setDel] = useState(false);

  if (m.error) return <AdminPage title="Member"><ErrorNote message={m.error.message} onRetry={m.reload} /></AdminPage>;
  if (!m.data) return <AdminPage title="Member"><Loading /></AdminPage>;
  const { user, profile: p, account } = m.data;
  const actions: Action[] = !p ? [] : p.status === "pending" ? ["approve", "reject"] : p.status === "approved" ? ["suspend"] : p.status === "rejected" ? ["approve"] : ["reinstate"];

  async function toggle(field: "featured" | "showInDirectory", value: boolean) {
    const res = await send(`/admin/members/${userId}`, "PATCH", { [field]: value });
    if (res.ok) {
      toast("success", "Saved.");
      void m.reload();
    } else toast("error", res.message);
  }

  return (
    <AdminPage
      title={user.name}
      description={user.email}
      actions={
        <>
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin/members">
              <ArrowLeft aria-hidden /> All Members
            </Link>
          </Button>
          {p?.status === "approved" && p.type === "mentor" && (
            <Button asChild variant="outline" size="sm">
              <Link href={routes.mentor(p.slug)} target="_blank" rel="noopener">
                Public Profile <ExternalLink aria-hidden />
              </Link>
            </Button>
          )}
        </>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Panel title="Profile">
          {!p ? (
            <Empty title="No member profile" text="This account was created on the old site but the member never completed the registration form." />
          ) : (
            <dl className="divide-y divide-rule">
              <Row k="Membership" v={<span className="flex flex-wrap gap-1.5"><Badge tone="brand">{p.membershipLabel ?? label(p.type)}</Badge><Badge tone={statusTone(p.status)}>{label(p.status)}</Badge></span>} />
              <Row k="Position" v={p.position} />
              <Row k="Qualification" v={p.qualification} />
              <Row k="Affiliation" v={p.affiliation} />
              <Row k="Location" v={p.city && p.country && !p.city.toLowerCase().includes(new Intl.DisplayNames(["en-GB"], { type: "region" }).of(p.country)?.toLowerCase() ?? "~") ? `${p.city} · ${p.country}` : (p.city ?? p.country)} />
              <Row k="Phone" v={p.phoneE164} />
              <Row k="Gender" v={p.gender} />
              <Row k="Research field" v={p.researchField} />
              <Row k="Expertise" v={p.expertise.map((e) => e.name).join(", ")} />
              <Row
                k="Links"
                v={
                  Object.keys(p.links ?? {}).length ? (
                    <ul className="space-y-1">
                      {Object.entries(p.links).map(([k, href]) => (
                        <li key={k}>
                          <a href={href} target="_blank" rel="noopener noreferrer nofollow" className="text-brand underline-offset-4 hover:underline">
                            {({ orcid: "ORCID", scholar: "Google Scholar", scopus: "Scopus", researchgate: "ResearchGate", website: "Website" } as Record<string, string>)[k] ?? label(k)}
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : null
                }
              />
              <Row k="Biography" v={p.bio ? <RichContent value={p.bio} compact /> : null} />
              {p.legacyId && <Row k="Old site id" v={<span className="numerals-tabular">{p.legacyId}</span>} />}
            </dl>
          )}
        </Panel>

        <div className="space-y-6">
          {p && (
            <Panel title="Decision">
              <p className="text-sm text-muted-ink">
                {p.reviewedAt ? `Last reviewed ${fmtDate(p.reviewedAt)}.` : "Not reviewed yet."}
                {p.reviewNote ? ` Note: ${richToPlainText(p.reviewNote)}` : ""}
              </p>
              {!user.emailVerified && !p.legacyId && <p className="mt-2 text-sm text-warning">Email not confirmed yet — approval is possible once they confirm.</p>}
              {!user.emailVerified && p.legacyId && <p className="mt-2 text-sm text-muted-ink">Applied on the old site, which did not confirm email addresses. Approving also marks their email as confirmed.</p>}
              <div className="mt-4 flex flex-wrap gap-2">
                {actions.map((a) => (
                  <Button key={a} variant={a === "approve" || a === "reinstate" ? "default" : "outline"} onClick={() => { setNote(""); setAction(a); }}>
                    {label(a)}
                  </Button>
                ))}
              </div>
              <div className="mt-5 space-y-2 border-t border-rule pt-4">
                <label className="flex min-h-11 items-center gap-2.5 text-sm text-ink">
                  <input type="checkbox" className="size-4 accent-[var(--brand)]" checked={p.featured} onChange={(e) => void toggle("featured", e.target.checked)} />
                  Featured on the homepage
                </label>
                <label className="flex min-h-11 items-center gap-2.5 text-sm text-ink">
                  <input type="checkbox" className="size-4 accent-[var(--brand)]" checked={p.showInDirectory} onChange={(e) => void toggle("showInDirectory", e.target.checked)} />
                  Shown in the mentoring directory
                </label>
              </div>
            </Panel>
          )}
          <Panel title="Account">
            <dl className="divide-y divide-rule">
              <Row k="Email" v={user.emailVerified ? <Badge tone="success">Confirmed</Badge> : <Badge tone="warning">Not confirmed</Badge>} />
              <Row k="Two-factor" v={user.twoFactorEnabled ? "On" : "Off"} />
              <Row k="Last sign-in" v={fmtDate(account.lastLoginAt, true)} />
              <Row k="Joined" v={fmtDate(user.createdAt)} />
              {account.banned && <Row k="Suspended" v={account.banReason} />}
            </dl>
            {me.role === "admin" && (
              <div className="mt-4 flex flex-wrap gap-2 border-t border-rule pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    const res = await send<{ revoked: number }>(`/admin/security/users/${userId}/revoke-sessions`, "POST");
                    toast(res.ok ? "success" : "error", res.ok ? `Signed out of ${res.data.revoked} session(s).` : res.message);
                  }}
                >
                  Sign Out Everywhere
                </Button>
                {user.role === "user" && (
                  <Button variant="outline" size="sm" className="border-destructive/40 text-destructive hover:border-destructive hover:bg-destructive-wash" onClick={() => setDel(true)}>
                    Delete Account
                  </Button>
                )}
              </div>
            )}
          </Panel>
        </div>
      </div>

      {action && (
        <Confirm
          open
          onOpenChange={(v) => !v && setAction(null)}
          title={ACTION_TEXT[action].title}
          description={ACTION_TEXT[action].description}
          confirmLabel={ACTION_TEXT[action].confirm}
          pendingLabel={ACTION_TEXT[action].pending}
          destructive={ACTION_TEXT[action].destructive}
          onConfirm={async () => {
            const res = await send(`/admin/members/${userId}/review`, "POST", { action, ...(note ? { note } : {}) });
            if (!res.ok) {
              toast("error", res.message);
              return true;
            }
            toast("success", `${user.name}: ${ACTION_TEXT[action].confirm.toLowerCase()}d.`.replace("ed d.", "ed."));
            void m.reload();
          }}
        >
          {action !== "approve" && action !== "reinstate" && (
            <RichTextArea id="review-note" label="Note (optional)" value={note} onChange={setNote} rows={3} max={500} />
          )}
        </Confirm>
      )}
      <Confirm
        open={del}
        onOpenChange={setDel}
        title="Delete This Account?"
        description="The account, profile and photo are deleted permanently. Their event sign-ups stay, without the link to the account. This cannot be undone."
        confirmLabel="Delete Permanently"
        pendingLabel="Deleting…"
        destructive
        onConfirm={async () => {
          const res = await send(`/admin/members/${userId}`, "DELETE");
          if (!res.ok) {
            toast("error", res.message);
            return true;
          }
          toast("success", "Account deleted.");
          router.replace("/admin/members");
        }}
      />
    </AdminPage>
  );
}
