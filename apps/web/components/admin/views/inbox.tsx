"use client";

import { RichContent } from "@/components/page/rich-text";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { AdminPage, Badge, Confirm, DataTable, Empty, ErrorNote, Labeled, Loading, Pager, Panel, Tabs, fmtDate, label, statusTone, useToast } from "@/components/admin/ui";
import { qs, send, useApi, type Paged } from "@/lib/admin/use-api";
import { useUrlState } from "@/lib/admin/url-state";

interface Message { id: string; name: string; email: string; subject: string; message: string; status: string; createdAt: string }
interface Quote { id: string; name: string; email: string; phoneE164: string | null; service: string; referenceStyle: string | null; wordCount: number | null; details: string; status: string; quotedAmount: string | null; currency: string | null; createdAt: string }
interface Subscriber { id: string; email: string; status: string; source: string | null; confirmedAt: string | null; createdAt: string }

const FILTERS: Record<string, [string, string][]> = {
  messages: [["", "All"], ["new", "New"], ["read", "Read"], ["archived", "Archived"]],
  quotes: [["", "All"], ["new", "New"], ["quoted", "Quoted"], ["accepted", "Accepted"], ["declined", "Declined"], ["closed", "Closed"]],
  subscribers: [["", "All"], ["confirmed", "Confirmed"], ["pending", "Waiting for confirmation"], ["unsubscribed", "Unsubscribed"]],
};

/** Deletes a message or quote after confirmation (spam, duplicates, tests). */
function DeleteButton({ what, path, onDone }: { what: string; path: string; onDone: () => void }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" size="sm" variant="ghost" className="text-destructive" onClick={() => setOpen(true)}>
        <Trash2 aria-hidden /> Delete
      </Button>
      <Confirm
        open={open}
        onOpenChange={setOpen}
        title={`Delete this ${what}?`}
        description="It is removed permanently. To keep it out of the way instead, archive or close it."
        confirmLabel="Delete"
        pendingLabel="Deleting…"
        destructive
        onConfirm={async () => {
          const res = await send(path, "DELETE");
          toast(res.ok ? "success" : "error", res.ok ? `The ${what} was deleted.` : res.message);
          if (res.ok) onDone();
        }}
      />
    </>
  );
}

function QuoteCard({ q, onSaved }: { q: Quote; onSaved: () => void }) {
  const toast = useToast();
  const [status, setStatus] = useState(q.status);
  const [amount, setAmount] = useState(q.quotedAmount ?? "");
  const [saving, setSaving] = useState(false);
  return (
    <article className="border-b border-rule py-4 last:border-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium text-ink">
          {q.name} <span className="font-normal text-muted-ink">· {label(q.service)}</span>
        </p>
        <Badge tone={statusTone(q.status)}>{label(q.status)}</Badge>
      </div>
      <p className="mt-1 text-sm break-all text-muted-ink">
        <a className="text-brand hover:underline" href={`mailto:${q.email}`}>{q.email}</a>
        {q.phoneE164 ? ` · ${q.phoneE164}` : ""} · {fmtDate(q.createdAt)}
        {q.wordCount ? ` · ${q.wordCount.toLocaleString("en-GB")} words` : ""}
        {q.referenceStyle ? ` · ${q.referenceStyle}` : ""}
      </p>
      <p className="mt-2 max-w-[70ch] text-[0.9375rem] whitespace-pre-line text-ink">{q.details}</p>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <Labeled id={`qs-${q.id}`} label="Status">
          <NativeSelect id={`qs-${q.id}`} value={status} onChange={(e) => setStatus(e.target.value)} className="h-11 w-44">
            {FILTERS.quotes!.slice(1).map(([v, t]) => (
              <option key={v} value={v}>{t}</option>
            ))}
          </NativeSelect>
        </Labeled>
        <Labeled id={`qa-${q.id}`} label={`Quoted amount (${q.currency ?? "GBP"})`}>
          <input id={`qa-${q.id}`} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))} className="h-11 w-36 rounded-md border border-input bg-surface px-3 text-sm" />
        </Labeled>
        <Button
          variant="outline"
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            const res = await send(`/admin/quotes/${q.id}`, "PATCH", { status, quotedAmount: amount || null });
            setSaving(false);
            toast(res.ok ? "success" : "error", res.ok ? "Quote updated." : res.message);
            if (res.ok) onSaved();
          }}
        >
          {saving ? "Saving…" : "Save"}
        </Button>
        <DeleteButton what="quote request" path={`/admin/quotes/${q.id}`} onDone={onSaved} />
      </div>
    </article>
  );
}

export function InboxView() {
  const url = useUrlState();
  const tab = url.get("tab", "messages");
  const toast = useToast();
  const endpoint = tab === "messages" ? "/admin/contact" : tab === "quotes" ? "/admin/quotes" : "/admin/subscribers";
  const data = useApi<Paged<Message & Quote & Subscriber>>(`${endpoint}${qs({ status: url.get("status"), page: url.page, pageSize: 20 })}`);
  const [open, setOpen] = useState<string | null>(null);

  async function markMessage(m: Message, status: string) {
    const res = await send(`/admin/contact/${m.id}`, "PATCH", { status });
    if (res.ok) void data.reload();
    else toast("error", res.message);
  }

  return (
    <AdminPage title="Inbox" description="Contact messages, editing and poster quote requests, and newsletter subscribers.">
      <Tabs label="Inbox" tabs={[["messages", "Messages"], ["quotes", "Quote Requests"], ["subscribers", "Subscribers"]]} value={tab} onChange={(t) => url.set({ tab: t === "messages" ? null : t, status: null })} />
      <Panel>
        <div className="max-w-xs">
          <Labeled id="inbox-status" label="Show">
            <NativeSelect id="inbox-status" value={url.get("status")} onChange={(e) => url.set({ status: e.target.value })}>
              {FILTERS[tab]!.map(([v, t]) => (
                <option key={v} value={v}>{t}</option>
              ))}
            </NativeSelect>
          </Labeled>
        </div>
        <div className="mt-5">
          {data.error && <ErrorNote message={data.error.message} onRetry={data.reload} />}
          {data.loading && !data.data && <Loading />}
          {data.data && data.data.items.length === 0 && <Empty title="Nothing here" text="New items appear here as people use the website forms." />}
          {data.data && data.data.items.length > 0 && tab === "messages" && (
            <ul className="divide-y divide-rule">
              {data.data.items.map((m) => (
                <li key={m.id} className="py-3">
                  <button
                    type="button"
                    className="flex w-full flex-wrap items-center justify-between gap-2 rounded-sm text-left"
                    aria-expanded={open === m.id}
                    onClick={() => {
                      setOpen(open === m.id ? null : m.id);
                      if (m.status === "new") void markMessage(m, "read");
                    }}
                  >
                    <span className={m.status === "new" ? "font-semibold text-ink" : "text-ink"}>{m.subject}</span>
                    <span className="flex items-center gap-2 text-xs text-faint-ink">
                      {m.status === "new" && <Badge tone="brand">New</Badge>}
                      {fmtDate(m.createdAt)}
                    </span>
                  </button>
                  <p className="text-sm text-muted-ink">
                    {m.name} · <a className="text-brand hover:underline" href={`mailto:${m.email}`}>{m.email}</a>
                  </p>
                  {open === m.id && (
                    <div className="mt-3 rounded-md bg-paper p-4">
                      <RichContent value={m.message} compact className="max-w-[70ch] text-[0.9375rem] text-ink" />
                      <div className="mt-3 flex gap-2">
                        <Button asChild size="sm"><a href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject}`)}`}>Reply by Email</a></Button>
                        {m.status !== "archived" && <Button size="sm" variant="outline" onClick={() => void markMessage(m, "archived")}>Archive</Button>}
                        <DeleteButton what="message" path={`/admin/contact/${m.id}`} onDone={data.reload} />
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
          {data.data && data.data.items.length > 0 && tab === "quotes" && data.data.items.map((q) => <QuoteCard key={q.id} q={q} onSaved={data.reload} />)}
          {data.data && data.data.items.length > 0 && tab === "subscribers" && (
            <DataTable
              caption="Newsletter subscribers"
              rows={data.data.items}
              rowKey={(r) => r.id}
              columns={[
                { key: "email", header: "Email", cell: (r) => <span className="break-all">{r.email}</span> },
                { key: "status", header: "Status", cell: (r) => <Badge tone={r.status === "confirmed" ? "success" : r.status === "pending" ? "warning" : "neutral"}>{label(r.status)}</Badge> },
                { key: "since", header: "Since", cell: (r) => fmtDate(r.confirmedAt ?? r.createdAt), hideBelow: "sm" },
              ]}
            />
          )}
          {data.data && <Pager page={data.data.page} pages={data.data.pages} total={data.data.total} onPage={(p) => url.set({ page: p })} />}
        </div>
      </Panel>
    </AdminPage>
  );
}
