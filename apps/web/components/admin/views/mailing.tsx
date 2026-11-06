"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileUp, Pencil, Plus, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { useAdmin } from "@/components/admin/shell";
import { AdminPage, Badge, Confirm, DataTable, Empty, ErrorNote, Loading, Pager, Panel, Tabs, fmtDate, label, statusTone, useToast } from "@/components/admin/ui";
import { Check, FormGrid, RichTextArea, TextArea, TextInput } from "@/components/admin/form";
import { richToPlainText } from "@ritechs/shared";
import { qs, send, useApi, type Paged } from "@/lib/admin/use-api";
import { useUrlState } from "@/lib/admin/url-state";

interface Group {
  id: string;
  name: string;
  description: string | null;
  members: number;
  createdAt: string;
}
interface Campaign {
  id: string;
  subject: string;
  status: string;
  audience: {
    memberTypes?: string[];
    groupIds?: string[];
    newsletter?: boolean;
  };
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  createdAt: string;
  queuedAt: string | null;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function NewGroup({ onCreated }: { onCreated: () => void }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus aria-hidden /> New Group
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:w-[min(32rem,calc(100vw-3rem))]">
          <div className="overflow-y-auto px-5 pt-6 pb-6 sm:px-7">
            <DialogTitle className="pr-10 font-serif text-2xl text-ink">New Mail Group</DialogTitle>
            <DialogDescription className="mt-1 text-sm text-muted-ink">A named list of email addresses, e.g. conference reviewers.</DialogDescription>
            <form
              className="mt-5 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                start(async () => {
                  const res = await send("/admin/mailing/groups", "POST", {
                    name,
                    description: description || null,
                  });
                  if (!res.ok) return setErrors(res.fields ?? { name: res.message });
                  toast("success", "Group created.");
                  setOpen(false);
                  setName("");
                  setDescription("");
                  onCreated();
                });
              }}
            >
              <TextInput id="name" label="Name" value={name} onChange={setName} errors={errors} />
              <RichTextArea id="description" label="Description (optional)" value={description} onChange={setDescription} rows={2} max={500} />
              <Button type="submit" disabled={pending}>
                {pending && <Spinner />}
                {pending ? "Creating…" : "Create Group"}
              </Button>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Compose({ groups, onSaved, isAdmin }: { groups: Group[]; onSaved: () => void; isAdmin: boolean }) {
  const toast = useToast();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [types, setTypes] = useState<string[]>([]);
  const [newsletter, setNewsletter] = useState(false);
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState<string | null>(null);

  async function saveDraft() {
    const res = await send<{ id: string }>("/admin/mailing/campaigns", "POST", {
      subject,
      bodyHtml: body,
      audience: { memberTypes: types, groupIds, newsletter },
    });
    if (!res.ok) {
      setErrors(res.fields ?? {});
      toast("error", res.message);
      return null;
    }
    setErrors({});
    return res.data.id;
  }

  return (
    <Panel title="Write an Email">
      <div className="space-y-4">
        <TextInput id="subject" label="Subject" value={subject} onChange={setSubject} errors={errors} />
        <RichTextArea
          id="bodyHtml"
          label="Message"
          variant="full"
          value={body}
          onChange={setBody}
          errors={errors}
          rows={10}
          hint="An unsubscribe link is added automatically."
        />
        <fieldset>
          <legend className="text-sm font-medium text-ink">Send to</legend>
          {errors.audience && <p className="mt-1 text-sm text-destructive">{errors.audience}</p>}
          <div className="mt-1 grid gap-x-6 sm:grid-cols-2">
            <Check
              id="aud-mentor"
              label="All approved mentors"
              checked={types.includes("mentor")}
              onChange={(v) => setTypes(v ? [...types, "mentor"] : types.filter((x) => x !== "mentor"))}
            />
            <Check
              id="aud-mentee"
              label="All approved mentees"
              checked={types.includes("mentee")}
              onChange={(v) => setTypes(v ? [...types, "mentee"] : types.filter((x) => x !== "mentee"))}
            />
            <Check id="aud-news" label="Newsletter subscribers" checked={newsletter} onChange={setNewsletter} />
          </div>
          {groups.length > 0 && (
            <details className="mt-2 rounded-md border border-rule p-3">
              <summary className="min-h-8 cursor-pointer text-sm font-medium text-ink">Mail groups ({groupIds.length} selected)</summary>
              <div className="mt-2 grid max-h-64 gap-x-6 overflow-y-auto sm:grid-cols-2">
                {groups.map((g) => (
                  <Check
                    key={g.id}
                    id={`aud-g-${g.id}`}
                    label={`${g.name} (${g.members})`}
                    checked={groupIds.includes(g.id)}
                    onChange={(v) => setGroupIds(v ? [...groupIds, g.id] : groupIds.filter((x) => x !== g.id))}
                  />
                ))}
              </div>
            </details>
          )}
        </fieldset>
        <p className="text-xs text-faint-ink">People who unsubscribed are never emailed. Addresses on several lists receive one copy.</p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={pending}
            onClick={() =>
              start(async () => {
                if (await saveDraft()) {
                  toast("success", "Draft saved.");
                  onSaved();
                }
              })
            }
          >
            Save Draft
          </Button>
          {isAdmin && (
            <Button
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const draftId = await saveDraft();
                  if (draftId) setConfirm(draftId);
                })
              }
            >
              {pending && <Spinner />}
              <Send aria-hidden /> {pending ? "Preparing…" : "Send…"}
            </Button>
          )}
        </div>
        {!isAdmin && <p className="text-sm text-muted-ink">Only administrators can send. Save a draft and ask an admin to send it.</p>}
      </div>
      <Confirm
        open={!!confirm}
        onOpenChange={(v) => !v && setConfirm(null)}
        title="Send This Email Now?"
        description="It goes out over the next few minutes (about 8 emails per second). You can cancel while it is sending, but emails already sent cannot be recalled."
        confirmLabel="Send Now"
        pendingLabel="Queuing…"
        onConfirm={async () => {
          const res = await send(`/admin/mailing/campaigns/${confirm}/send`, "POST");
          if (!res.ok) {
            toast("error", res.message);
            return true;
          }
          toast("success", "Sending has started.");
          setSubject("");
          setBody("");
          onSaved();
        }}
      />
    </Panel>
  );
}

export function MailingView() {
  const me = useAdmin();
  const url = useUrlState();
  const tab = url.get("tab", "groups");
  const toast = useToast();
  const groups = useApi<Group[]>("/admin/mailing/groups");
  const campaigns = useApi<Paged<Campaign>>(tab === "campaigns" ? `/admin/mailing/campaigns${qs({ page: url.page })}` : null);
  return (
    <AdminPage
      title="Mailing"
      description="Mail groups and email campaigns to members, groups and newsletter subscribers."
      actions={tab === "groups" ? <NewGroup onCreated={groups.reload} /> : undefined}
    >
      <Tabs
        label="Mailing"
        tabs={[
          ["groups", "Groups"],
          ["campaigns", "Campaigns"],
        ]}
        value={tab}
        onChange={(t) => url.set({ tab: t === "groups" ? null : t })}
      />
      {tab === "groups" ? (
        <Panel>
          {groups.error && <ErrorNote message={groups.error.message} onRetry={groups.reload} />}
          {groups.loading && !groups.data && <Loading />}
          {groups.data && groups.data.length === 0 && <Empty title="No mail groups yet" />}
          {groups.data && groups.data.length > 0 && (
            <DataTable
              caption="Mail groups"
              rows={groups.data}
              rowKey={(r) => r.id}
              onRowHref={(r) => `/admin/mailing/groups/${r.id}`}
              columns={[
                { key: "name", header: "Group", cell: (r) => r.name },
                {
                  key: "n",
                  header: "Addresses",
                  cell: (r) => <span className="numerals-tabular">{r.members}</span>,
                },
                {
                  key: "desc",
                  header: "Description",
                  cell: (r) => (r.description ? richToPlainText(r.description) : "—"),
                  hideBelow: "md",
                },
              ]}
            />
          )}
        </Panel>
      ) : (
        <>
          <Compose groups={groups.data ?? []} isAdmin={me.role === "admin"} onSaved={() => void campaigns.reload()} />
          <Panel title="Sent and Drafts">
            {campaigns.error && <ErrorNote message={campaigns.error.message} onRetry={campaigns.reload} />}
            {campaigns.loading && !campaigns.data && <Loading />}
            {campaigns.data && campaigns.data.items.length === 0 && <Empty title="No campaigns yet" />}
            {campaigns.data && campaigns.data.items.length > 0 && (
              <>
                <DataTable
                  caption="Campaigns"
                  rows={campaigns.data.items}
                  rowKey={(r) => r.id}
                  columns={[
                    {
                      key: "subject",
                      header: "Subject",
                      cell: (r) => <span className="font-medium">{r.subject}</span>,
                    },
                    {
                      key: "status",
                      header: "Status",
                      cell: (r) => <Badge tone={statusTone(r.status)}>{label(r.status)}</Badge>,
                    },
                    {
                      key: "progress",
                      header: "Delivered",
                      cell: (r) =>
                        r.recipientCount ? (
                          <span className="numerals-tabular">
                            {r.sentCount} / {r.recipientCount}
                            {r.failedCount ? ` (${r.failedCount} failed)` : ""}
                          </span>
                        ) : (
                          "—"
                        ),
                      hideBelow: "sm",
                    },
                    {
                      key: "date",
                      header: "Created",
                      cell: (r) => fmtDate(r.createdAt),
                      hideBelow: "md",
                    },
                    {
                      key: "act",
                      header: "",
                      cell: (r) =>
                        ["draft", "queued", "sending"].includes(r.status) ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={async () => {
                              const res = await send(`/admin/mailing/campaigns/${r.id}/cancel`, "POST");
                              toast(res.ok ? "success" : "error", res.ok ? "Cancelled." : res.message);
                              void campaigns.reload();
                            }}
                          >
                            Cancel
                          </Button>
                        ) : null,
                    },
                  ]}
                />
                <Pager page={campaigns.data.page} pages={campaigns.data.pages} total={campaigns.data.total} onPage={(p) => url.set({ page: p })} />
              </>
            )}
          </Panel>
        </>
      )}
    </AdminPage>
  );
}

/* ------------------------------- group detail ------------------------------ */

/** Splits CSV text into rows, honouring quoted fields ("Lee, Kim") and doubled quotes. Separator: comma, semicolon or tab, detected from the first line. */
function parseCsv(text: string): string[][] {
  const first = text.split(/\r?\n/, 1)[0] ?? "";
  const sep = [",", ";", "\t"].sort((a, b) => first.split(b).length - first.split(a).length)[0]!;
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === sep) {
      row.push(cell.trim());
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell.trim());
      rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (cell || row.length) {
    row.push(cell.trim());
    rows.push(row);
  }
  return rows;
}

/**
 * Reads "Name <email>" lines from a CSV export (Excel, Google Sheets): finds the
 * email column by its header or contents, and a name column if there is one.
 */
export function csvToPeople(text: string): string[] {
  const rows = parseCsv(text.replace(/^\uFEFF/, "")).filter((r) => r.some(Boolean));
  if (!rows.length) return [];
  const head = rows[0]!.map((h) => h.toLowerCase());
  const hasHeader = !head.some((h) => EMAIL.test(h));
  const emailCol = hasHeader ? head.findIndex((h) => /e-?mail/.test(h)) : rows[0]!.findIndex((c) => EMAIL.test(c));
  const nameCol = hasHeader ? head.findIndex((h) => /name/.test(h) && !/e-?mail/.test(h)) : -1;
  const out: string[] = [];
  for (const r of hasHeader ? rows.slice(1) : rows) {
    const email = (emailCol >= 0 ? r[emailCol] : r.find((c) => EMAIL.test(c))) ?? "";
    if (!EMAIL.test(email)) continue;
    const name =
      nameCol >= 0
        ? (r[nameCol] ?? "")
            .replace(/[<>,;]/g, " ")
            .replace(/\s+/g, " ")
            .trim()
        : "";
    out.push(name ? `${name} <${email}>` : email);
  }
  return out;
}

function GroupDetails({ id, name, description, onSaved }: { id: string; name: string; description: string; onSaved: () => void }) {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [n, setN] = useState(name);
  const [d, setD] = useState(description);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  if (!editing)
    return (
      <div className="flex justify-end">
        <Button type="button" variant="outline" size="sm" onClick={() => (setN(name), setD(description), setEditing(true))}>
          <Pencil aria-hidden /> Rename or Describe
        </Button>
      </div>
    );
  return (
    <Panel title="Group Details">
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const res = await send(`/admin/mailing/groups/${id}`, "PUT", {
              name: n.trim(),
              description: d || null,
            });
            if (!res.ok) return setErrors(res.fields ?? { name: res.message });
            toast("success", "Group saved.");
            setEditing(false);
            onSaved();
          });
        }}
      >
        <FormGrid>
          <TextInput id="name" label="Name" value={n} onChange={setN} errors={errors} />
          <RichTextArea id="description" label="Description (optional)" value={d} onChange={setD} errors={errors} rows={2} max={500} />
        </FormGrid>
        <div className="mt-4 flex gap-2">
          <Button type="submit" disabled={pending}>
            {pending && <Spinner />}
            {pending ? "Saving…" : "Save"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        </div>
      </form>
    </Panel>
  );
}

interface GroupMember {
  id: string;
  name: string | null;
  email: string;
  createdAt: string;
}

export function MailGroupView({ id }: { id: string }) {
  const router = useRouter();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const groups = useApi<Group[]>("/admin/mailing/groups");
  const members = useApi<Paged<GroupMember>>(`/admin/mailing/groups/${id}/members?page=${page}&pageSize=50`);
  const [paste, setPaste] = useState("");
  const [pending, start] = useTransition();
  const [del, setDel] = useState(false);
  const csvInput = useRef<HTMLInputElement>(null);
  const group = groups.data?.find((g) => g.id === id);

  const parsed = paste
    .split(/[\n,;]+/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const m = l.match(/^(.*?)\s*<([^>]+)>$/);
      return m
        ? {
            name: m[1]!.replace(/"/g, "").trim() || undefined,
            email: m[2]!.trim().toLowerCase(),
          }
        : { email: l.toLowerCase() };
    });
  const valid = parsed.filter((p) => EMAIL.test(p.email));

  return (
    <AdminPage
      title={group?.name ?? "Mail Group"}
      description={group?.description ? richToPlainText(group.description) : undefined}
      actions={
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/mailing">
            <ArrowLeft aria-hidden /> All Groups
          </Link>
        </Button>
      }
    >
      {group && <GroupDetails id={id} name={group.name} description={group.description ?? ""} onSaved={groups.reload} />}
      <Panel
        title="Add Addresses"
        actions={
          <>
            <input
              ref={csvInput}
              type="file"
              accept=".csv,text/csv,.txt"
              className="sr-only"
              aria-label="Import a CSV file"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                if (file.size > 2_000_000) return toast("error", "That file is too large. Use a CSV under 2 MB.");
                const rows = csvToPeople(await file.text());
                if (!rows.length) return toast("error", "No email addresses were found in that file.");
                setPaste((p) => [p.trim(), ...rows].filter(Boolean).join("\n"));
                toast("success", `${rows.length} row${rows.length === 1 ? "" : "s"} read from ${file.name}. Check them, then add.`);
              }}
            />
            <Button type="button" variant="outline" size="sm" onClick={() => csvInput.current?.click()}>
              <FileUp aria-hidden /> Import CSV
            </Button>
          </>
        }
      >
        <TextArea
          id="paste"
          label="Email addresses"
          value={paste}
          onChange={setPaste}
          rows={5}
          hint="One per line, or separated by commas. “Name <email>” works too. A CSV with name and email columns (as exported from Excel) can be imported. Duplicates are ignored."
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button
            disabled={pending || valid.length === 0}
            onClick={() =>
              start(async () => {
                const res = await send<{ added: number }>(`/admin/mailing/groups/${id}/members`, "POST", { people: valid });
                if (!res.ok) return toast("error", res.message);
                toast("success", `${res.data.added} address${res.data.added === 1 ? "" : "es"} added.`);
                setPaste("");
                void members.reload();
                void groups.reload();
              })
            }
          >
            {pending && <Spinner />}
            {pending ? "Adding…" : `Add ${valid.length || ""} Address${valid.length === 1 ? "" : "es"}`}
          </Button>
          {parsed.length > valid.length && (
            <span className="text-sm text-warning">
              {parsed.length - valid.length} entr
              {parsed.length - valid.length === 1 ? "y is" : "ies are"} not valid and will be skipped.
            </span>
          )}
        </div>
      </Panel>
      <Panel title="Addresses">
        {members.error && <ErrorNote message={members.error.message} onRetry={members.reload} />}
        {members.loading && !members.data && <Loading />}
        {members.data && members.data.items.length === 0 && <Empty title="This group is empty" />}
        {members.data && members.data.items.length > 0 && (
          <>
            <DataTable
              caption="Addresses in this group"
              rows={members.data.items}
              rowKey={(r) => r.id}
              columns={[
                {
                  key: "email",
                  header: "Email",
                  cell: (r) => <span className="break-all">{r.email}</span>,
                },
                {
                  key: "name",
                  header: "Name",
                  cell: (r) => r.name ?? "—",
                  hideBelow: "sm",
                },
                {
                  key: "rm",
                  header: "",
                  className: "w-14",
                  cell: (r) => (
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label={`Remove ${r.email}`}
                      onClick={async () => {
                        const res = await send(`/admin/mailing/groups/${id}/members/${r.id}`, "DELETE");
                        if (res.ok) void members.reload();
                        else toast("error", res.message);
                      }}
                    >
                      <Trash2 aria-hidden className="text-destructive" />
                    </Button>
                  ),
                },
              ]}
            />
            <Pager page={members.data.page} pages={members.data.pages} total={members.data.total} onPage={setPage} />
          </>
        )}
      </Panel>
      <div>
        <Button variant="ghost" className="text-destructive" onClick={() => setDel(true)}>
          Delete Group
        </Button>
      </div>
      <Confirm
        open={del}
        onOpenChange={setDel}
        title="Delete This Group?"
        description="The group and its list of addresses are deleted. Past campaigns are not affected."
        confirmLabel="Delete Group"
        pendingLabel="Deleting…"
        destructive
        onConfirm={async () => {
          const res = await send(`/admin/mailing/groups/${id}`, "DELETE");
          if (!res.ok) {
            toast("error", res.message);
            return true;
          }
          router.replace("/admin/mailing");
        }}
      />
    </AdminPage>
  );
}
