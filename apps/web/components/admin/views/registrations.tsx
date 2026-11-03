"use client";

import { useState } from "react";
import Link from "next/link";
import { Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminPage, Badge, Confirm, DataTable, Empty, ErrorNote, Loading, Pager, Panel, Tabs, fmtDate, label, statusTone, useToast } from "@/components/admin/ui";
import { SearchBox } from "@/components/admin/media";
import { useAdmin } from "@/components/admin/shell";
import { qs, send, useApi, type Paged } from "@/lib/admin/use-api";
import { useUrlState } from "@/lib/admin/url-state";

interface Row {
  id: string;
  name: string;
  email: string;
  phoneE164: string | null;
  organisation: string | null;
  attendance: string | null;
  notes: string | null;
  status: string;
  createdAt: string;
  eventId: string | null;
  conferenceId: string | null;
  eventTitle: string | null;
  eventType: string | null;
  eventFee: string | null;
  eventCurrency: string | null;
  conferenceAcronym: string | null;
}

const STATUSES: [string, string][] = [
  ["pending", "Pending"],
  ["confirmed", "Confirmed"],
  ["waitlisted", "Waiting list"],
  ["cancelled", "Cancelled"],
];

/** Every sign-up for conferences and events in one place (the old site's "Event requests"). */
export function RegistrationsView() {
  const me = useAdmin();
  const url = useUrlState();
  const toast = useToast();
  const kind = url.get("kind");
  const status = url.get("status");
  const list = useApi<Paged<Row>>(`/admin/registrations${qs({ q: url.get("q"), kind, status, page: url.page, pageSize: 25 })}`);
  const [del, setDel] = useState<Row | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function setStatus(r: Row, next: string) {
    setBusy(r.id);
    const res = await send(`/admin/registrations/${r.id}`, "PATCH", { status: next });
    setBusy(null);
    toast(res.ok ? "success" : "error", res.ok ? `${r.name}: ${label(next).toLowerCase()}.` : res.message);
    if (res.ok) void list.reload();
  }

  return (
    <AdminPage
      title="Registrations"
      description="Everyone who signed up for a conference or event. Open a conference or event to see only its sign-ups."
      actions={
        <Button asChild variant="outline">
          <a href="/api/admin/registrations.csv" download>
            <Download aria-hidden /> Download All (CSV)
          </a>
        </Button>
      }
    >
      <Tabs
        label="Type"
        tabs={[
          ["", "All"],
          ["event", "Events"],
          ["conference", "Conferences"],
        ]}
        value={kind}
        onChange={(v) => url.set({ kind: v })}
      />
      <Panel
        actions={
          <div className="flex w-full flex-col gap-2 sm:flex-row">
            <SearchBox value={url.get("q")} onChange={(q) => url.set({ q })} placeholder="Name, email, organisation or event…" label="Search registrations" />
            <label htmlFor="reg-status" className="sr-only">
              Status
            </label>
            <select id="reg-status" value={status} onChange={(e) => url.set({ status: e.target.value })} className="h-11 rounded-md border border-rule bg-surface px-3 text-sm text-ink md:h-10">
              <option value="">Any status</option>
              {STATUSES.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
        }
      >
        {list.error && <ErrorNote message={list.error.message} onRetry={list.reload} />}
        {list.loading && !list.data && <Loading />}
        {list.data && list.data.items.length === 0 && <Empty title={url.get("q") || status || kind ? "No registrations match" : "No registrations yet"} />}
        {list.data && list.data.items.length > 0 && (
          <>
            <DataTable
              caption="Registrations"
              rows={list.data.items}
              rowKey={(r) => r.id}
              columns={[
                {
                  key: "person",
                  header: "Person",
                  cell: (r) => (
                    <span className="block min-w-0">
                      <span className="block font-medium text-ink">{r.name}</span>
                      <a href={`mailto:${r.email}`} className="block text-xs break-all text-brand hover:underline">
                        {r.email}
                      </a>
                      {r.phoneE164 && <span className="block text-xs text-muted-ink">{r.phoneE164}</span>}
                    </span>
                  ),
                },
                {
                  key: "what",
                  header: "For",
                  cell: (r) => (
                    <Link href={r.conferenceId ? `/admin/conferences/${r.conferenceId}` : `/admin/events/${r.eventId}`} className="block text-ink hover:text-brand">
                      <span className="block">{r.conferenceAcronym ?? r.eventTitle ?? "—"}</span>
                      <span className="block text-xs text-muted-ink">
                        {r.conferenceId ? "Conference" : label(r.eventType ?? "event")}
                        {r.eventFee && Number(r.eventFee) > 0 ? ` · ${r.eventCurrency} ${Number(r.eventFee).toLocaleString("en-GB")}` : ""}
                      </span>
                    </Link>
                  ),
                },
                { key: "org", header: "Organisation", cell: (r) => r.organisation ?? "—", hideBelow: "lg" },
                { key: "date", header: "Signed up", cell: (r) => fmtDate(r.createdAt), hideBelow: "md" },
                {
                  key: "status",
                  header: "Status",
                  cell: (r) => (
                    <span className="flex flex-col items-start gap-1.5">
                      <Badge tone={statusTone(r.status)}>{label(r.status)}</Badge>
                      <select
                        aria-label={`Change status for ${r.name}`}
                        value={r.status}
                        disabled={busy === r.id}
                        onChange={(e) => void setStatus(r, e.target.value)}
                        className="h-9 rounded-md border border-rule bg-surface px-2 text-xs text-ink"
                      >
                        {STATUSES.map(([v, l]) => (
                          <option key={v} value={v}>
                            {l}
                          </option>
                        ))}
                      </select>
                    </span>
                  ),
                },
                ...(me.role === "admin"
                  ? [
                      {
                        key: "del",
                        header: "",
                        className: "w-14 text-right",
                        cell: (r: Row) => (
                          <Button variant="ghost" size="icon" className="text-destructive" aria-label={`Delete the registration of ${r.name}`} onClick={() => setDel(r)}>
                            <Trash2 aria-hidden />
                          </Button>
                        ),
                      },
                    ]
                  : []),
              ]}
            />
            <Pager page={list.data.page} pages={list.data.pages} total={list.data.total} onPage={(p) => url.set({ page: p })} />
          </>
        )}
      </Panel>
      <Confirm
        open={!!del}
        onOpenChange={(v) => !v && setDel(null)}
        title="Delete this registration?"
        description={`${del?.name ?? ""} is removed from the list for good. To keep a record, set the status to Cancelled instead.`}
        confirmLabel="Delete Registration"
        pendingLabel="Deleting…"
        destructive
        onConfirm={async () => {
          const res = await send(`/admin/registrations/${del!.id}`, "DELETE");
          toast(res.ok ? "success" : "error", res.ok ? "Registration deleted." : res.message);
          if (res.ok) void list.reload();
        }}
      />
    </AdminPage>
  );
}
