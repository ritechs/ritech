"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { useAdmin } from "@/components/admin/shell";
import { AdminPage, Badge, Confirm, DataTable, Empty, ErrorNote, Loading, Pager, Panel, fmtDate, label, statusTone, useToast } from "@/components/admin/ui";
import { Check, FormGrid, Select, TextArea, TextInput, focusFirstError } from "@/components/admin/form";
import { EntityPicker, SPEAKERS, type Picked } from "@/components/admin/pickers";
import { ImageField } from "@/components/admin/media";
import { htmlToText, slugify, textToHtml } from "@/lib/admin/text";
import { qs, send, useApi, type Paged } from "@/lib/admin/use-api";
import { useUrlState } from "@/lib/admin/url-state";

const TYPES: [string, string][] = [["seminar", "Seminar"], ["bootcamp", "Boot camp"], ["research-adda", "Research Adda"], ["cyber4me", "Cyber4Me"], ["workshop", "Workshop"], ["webinar", "Webinar"]];

interface EventRow {
  id: string;
  slug: string;
  type: string;
  title: string;
  location: string | null;
  startsAt: string | null;
  registrationOpen: boolean;
  status: string;
}

export function EventsView() {
  const url = useUrlState();
  const [q, setQ] = useState(url.get("q"));
  const list = useApi<Paged<EventRow>>(`/admin/events${qs({ q: url.get("q"), type: url.get("type"), when: url.get("when", "all"), page: url.page, pageSize: 25 })}`);
  return (
    <AdminPage
      title="Events"
      description="Seminars, boot camps, Research Adda, Cyber4Me sessions and their sign-ups."
      actions={
        <Button asChild>
          <Link href="/admin/events/new">
            <Plus aria-hidden /> New Event
          </Link>
        </Button>
      }
    >
      <Panel>
        <form className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]" onSubmit={(e) => (e.preventDefault(), url.set({ q }))}>
          <label htmlFor="e-q" className="sr-only">
            Search events
          </label>
          <Input id="e-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Event title…" />
          <label htmlFor="e-type" className="sr-only">
            Type
          </label>
          <NativeSelect id="e-type" value={url.get("type")} onChange={(e) => url.set({ type: e.target.value })}>
            <option value="">All types</option>
            {TYPES.map(([v, t]) => (
              <option key={v} value={v}>
                {t}
              </option>
            ))}
          </NativeSelect>
          <label htmlFor="e-when" className="sr-only">
            When
          </label>
          <NativeSelect id="e-when" value={url.get("when", "all")} onChange={(e) => url.set({ when: e.target.value === "all" ? null : e.target.value })}>
            <option value="all">Any time</option>
            <option value="upcoming">Upcoming</option>
            <option value="past">Past</option>
          </NativeSelect>
          <Button type="submit" variant="outline">
            Search
          </Button>
        </form>
        <div className="mt-5">
          {list.error && <ErrorNote message={list.error.message} onRetry={list.reload} />}
          {list.loading && !list.data && <Loading />}
          {list.data && list.data.items.length === 0 && <Empty title="No events match" />}
          {list.data && list.data.items.length > 0 && (
            <>
              <DataTable
                caption="Events"
                rows={list.data.items}
                rowKey={(r) => r.id}
                onRowHref={(r) => `/admin/events/${r.id}`}
                columns={[
                  { key: "title", header: "Event", cell: (r) => r.title },
                  { key: "type", header: "Type", cell: (r) => TYPES.find(([v]) => v === r.type)?.[1] ?? r.type, hideBelow: "sm" },
                  { key: "date", header: "Date", cell: (r) => fmtDate(r.startsAt), hideBelow: "md" },
                  { key: "status", header: "Status", cell: (r) => <span className="flex flex-wrap gap-1"><Badge tone={statusTone(r.status)}>{label(r.status)}</Badge>{r.registrationOpen && <Badge tone="success">Sign-up open</Badge>}</span> },
                ]}
              />
              <Pager page={list.data.page} pages={list.data.pages} total={list.data.total} onPage={(p) => url.set({ page: p })} />
            </>
          )}
        </div>
      </Panel>
    </AdminPage>
  );
}

/* --------------------------------- editor -------------------------------- */

interface Form {
  slug: string; type: string; title: string; summary: string; description: string; venue: string; location: string; mode: string;
  startsAt: string; endsAt: string; fee: string; currency: string; capacity: string; registrationOpen: boolean; status: string;
  speakers: Picked[]; cover: { id: string | null; url: string | null; changed: boolean };
}
const EMPTY: Form = { slug: "", type: "seminar", title: "", summary: "", description: "", venue: "", location: "", mode: "in-person", startsAt: "", endsAt: "", fee: "", currency: "GBP", capacity: "", registrationOpen: false, status: "draft", speakers: [], cover: { id: null, url: null, changed: false } };

/** <input type="datetime-local"> works in local time; the API stores UTC. */
const toLocal = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() - new Date(iso).getTimezoneOffset() * 60_000).toISOString().slice(0, 16) : "");
const fromLocal = (v: string) => (v ? new Date(v).toISOString() : null);

/* eslint-disable @typescript-eslint/no-explicit-any */
const fromApi = (e: any): Form => ({
  slug: e.slug, type: e.type, title: e.title, summary: e.summary ?? "", description: htmlToText(e.description), venue: e.venue ?? "", location: e.location ?? "", mode: e.mode,
  startsAt: toLocal(e.startsAt), endsAt: toLocal(e.endsAt), fee: e.fee ?? "", currency: e.currency, capacity: e.capacity ? String(e.capacity) : "", registrationOpen: e.registrationOpen, status: e.status,
  speakers: (e.speakers ?? []).map((s: any) => ({ id: s.id, name: s.name, sub: [s.designation, s.organisation].filter(Boolean).join(", ") || null, image: s.photoUrl })),
  cover: { id: e.coverId ?? null, url: e.coverUrl ?? null, changed: false },
});
/* eslint-enable @typescript-eslint/no-explicit-any */

interface Registration { id: string; name: string; email: string; organisation: string | null; attendance: string | null; status: string; createdAt: string }

export function EventEditor({ id }: { id: string }) {
  const isNew = id === "new";
  const me = useAdmin();
  const router = useRouter();
  const toast = useToast();
  const loaded = useApi<unknown>(isNew ? null : `/admin/events/${id}`);
  const [regPage, setRegPage] = useState(1);
  const regs = useApi<Paged<Registration>>(isNew ? null : `/admin/events/${id}/registrations?page=${regPage}&pageSize=20`);
  const [form, setForm] = useState<Form | null>(isNew ? EMPTY : null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, startSaving] = useTransition();
  const [del, setDel] = useState(false);

  useEffect(() => {
    if (loaded.data && !form) {
      const raf = requestAnimationFrame(() => setForm(fromApi(loaded.data)));
      return () => cancelAnimationFrame(raf);
    }
  }, [loaded.data, form]);

  if (loaded.error) return <AdminPage title="Event"><ErrorNote message={loaded.error.message} onRetry={loaded.reload} /></AdminPage>;
  if (!form) return <AdminPage title="Event"><Loading /></AdminPage>;
  const set = (patch: Partial<Form>) => setForm({ ...form, ...patch });

  function save(e: React.FormEvent) {
    e.preventDefault();
    const f = form!;
    const body = {
      slug: f.slug.trim() || slugify(f.title), type: f.type, title: f.title.trim(), summary: f.summary.trim() || null, description: f.description.trim() ? textToHtml(f.description) : null,
      venue: f.venue.trim() || null, location: f.location.trim() || null, mode: f.mode, startsAt: fromLocal(f.startsAt), endsAt: fromLocal(f.endsAt),
      fee: f.fee.trim() ? f.fee.replace(/[^\d.]/g, "") : null, currency: f.currency || "GBP", capacity: f.capacity ? Number(f.capacity) : null, registrationOpen: f.registrationOpen, status: f.status, speakerIds: f.speakers.map((x) => x.id),
      ...(f.cover.changed ? { coverId: f.cover.id } : {}),
    };
    startSaving(async () => {
      const res = await send<{ id: string }>(isNew ? "/admin/events" : `/admin/events/${id}`, isNew ? "POST" : "PUT", body);
      if (!res.ok) {
        const fields = res.fields ?? (res.code === "SLUG_TAKEN" ? { slug: res.message } : {});
        setErrors(fields);
        focusFirstError(fields);
        toast("error", res.message);
        return;
      }
      setErrors({});
      toast("success", isNew ? "Event created." : "Changes saved.");
      if (isNew) router.replace(`/admin/events/${res.data.id}`);
      else setForm(fromApi(res.data));
    });
  }

  async function setStatus(r: Registration, status: string) {
    const res = await send(`/admin/registrations/${r.id}`, "PATCH", { status });
    toast(res.ok ? "success" : "error", res.ok ? `${r.name}: ${label(status).toLowerCase()}.` : res.message);
    if (res.ok) void regs.reload();
  }

  return (
    <AdminPage
      title={isNew ? "New Event" : form.title || "Event"}
      actions={
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/events">
            <ArrowLeft aria-hidden /> All Events
          </Link>
        </Button>
      }
    >
      <form onSubmit={save} noValidate className="space-y-6">
        <Panel title="Details">
          <FormGrid>
            <TextInput id="title" label="Title" value={form.title} onChange={(v) => set({ title: v })} errors={errors} className="sm:col-span-2" />
            <Select id="type" label="Type" value={form.type} onChange={(v) => set({ type: v })} options={TYPES} />
            <TextInput id="slug" label="Web address" value={form.slug} onChange={(v) => set({ slug: v })} errors={errors} placeholder={slugify(form.title) || "e.g. research-seminar-2027…"} hint="Leave empty to create one from the title." />
            <TextInput id="startsAt" label="Starts" type="datetime-local" value={form.startsAt} onChange={(v) => set({ startsAt: v })} errors={errors} />
            <TextInput id="endsAt" label="Ends" type="datetime-local" value={form.endsAt} onChange={(v) => set({ endsAt: v })} errors={errors} />
            <TextInput id="location" label="Location" value={form.location} onChange={(v) => set({ location: v })} errors={errors} placeholder="e.g. Wolverhampton, UK…" />
            <Select id="mode" label="Format" value={form.mode} onChange={(v) => set({ mode: v })} options={[["in-person", "In person"], ["online", "Online"], ["hybrid", "Hybrid"]]} />
            <TextInput id="fee" label="Fee" inputMode="decimal" value={form.fee} onChange={(v) => set({ fee: v })} errors={errors} hint="Leave empty or 0 for free." />
            <TextInput id="currency" label="Currency" value={form.currency} onChange={(v) => set({ currency: v.toUpperCase().slice(0, 3) })} errors={errors} />
            <TextInput id="capacity" label="Places" inputMode="numeric" value={form.capacity} onChange={(v) => set({ capacity: v.replace(/\D/g, "") })} errors={errors} hint="Further sign-ups go on a waiting list. Empty = unlimited." />
            <Select id="status" label="Status" value={form.status} onChange={(v) => set({ status: v })} options={[["draft", "Draft (hidden)"], ["published", "Published"], ["archived", "Archived"]]} />
            <div className="sm:col-span-2">
              <Check id="registrationOpen" label="Sign-up open on the website" checked={form.registrationOpen} onChange={(v) => set({ registrationOpen: v })} />
            </div>
            <TextArea id="summary" label="Short summary" value={form.summary} onChange={(v) => set({ summary: v })} errors={errors} rows={2} className="sm:col-span-2" />
            <TextArea id="description" label="Description" value={form.description} onChange={(v) => set({ description: v })} errors={errors} rows={6} hint="Blank line between paragraphs; “- ” for bullets." className="sm:col-span-2" />
          </FormGrid>
        </Panel>
        <Panel title="Speakers and Image">
          <div className="grid gap-8 lg:grid-cols-2">
            <EntityPicker label="Speakers" noun="speaker" source={SPEAKERS} value={form.speakers} onChange={(speakers) => set({ speakers })} manageHref="/admin/speakers" />
            <ImageField label="Event image" purpose="cover" url={form.cover.url} name={form.title} onChange={(v) => set({ cover: { ...v, changed: true } })} hint="Optional. A landscape photo or flyer, JPG, PNG or WebP." />
          </div>
        </Panel>
        <div className="flex flex-wrap items-center justify-between gap-3">
          {!isNew && me.role === "admin" ? (
            <Button type="button" variant="ghost" className="text-destructive" onClick={() => setDel(true)}>
              Delete Event
            </Button>
          ) : (
            <span />
          )}
          <Button type="submit" disabled={saving}>
            {saving && <Spinner />}
            {saving ? "Saving…" : isNew ? "Create Event" : "Save Changes"}
          </Button>
        </div>
      </form>

      {!isNew && (
        <Panel
          title="Sign-ups"
          actions={
            regs.data && regs.data.total > 0 ? (
              <Button asChild variant="outline" size="sm">
                <a href={`/api/admin/events/${id}/registrations.csv`} download>
                  <Download aria-hidden /> Download CSV
                </a>
              </Button>
            ) : undefined
          }
        >
          {regs.error && <ErrorNote message={regs.error.message} onRetry={regs.reload} />}
          {regs.loading && !regs.data && <Loading />}
          {regs.data && regs.data.items.length === 0 && <Empty title="No sign-ups yet" />}
          {regs.data && regs.data.items.length > 0 && (
            <>
              <DataTable
                caption="Sign-ups"
                rows={regs.data.items}
                rowKey={(r) => r.id}
                columns={[
                  { key: "name", header: "Name", cell: (r) => <><span className="font-medium">{r.name}</span><span className="block text-xs break-all text-muted-ink">{r.email}</span></> },
                  { key: "org", header: "Organisation", cell: (r) => r.organisation ?? "—", hideBelow: "md" },
                  { key: "date", header: "Signed up", cell: (r) => fmtDate(r.createdAt), hideBelow: "sm" },
                  {
                    key: "status",
                    header: "Status",
                    cell: (r) => (
                      <>
                        <label htmlFor={`rs-${r.id}`} className="sr-only">
                          Status for {r.name}
                        </label>
                        <select id={`rs-${r.id}`} className="h-9 rounded-md border border-input bg-surface px-2 text-sm" value={r.status} onChange={(e) => void setStatus(r, e.target.value)}>
                          {["pending", "confirmed", "waitlisted", "cancelled"].map((s) => (
                            <option key={s} value={s}>
                              {label(s)}
                            </option>
                          ))}
                        </select>
                      </>
                    ),
                  },
                ]}
              />
              <Pager page={regs.data.page} pages={regs.data.pages} total={regs.data.total} onPage={setRegPage} />
            </>
          )}
        </Panel>
      )}
      <Confirm
        open={del}
        onOpenChange={setDel}
        title="Delete This Event?"
        description="The event and all its sign-ups are deleted. This cannot be undone — consider Archived instead."
        confirmLabel="Delete Permanently"
        pendingLabel="Deleting…"
        destructive
        onConfirm={async () => {
          const res = await send(`/admin/events/${id}`, "DELETE");
          if (!res.ok) {
            toast("error", res.message);
            return true;
          }
          toast("success", "Event deleted.");
          router.replace("/admin/events");
        }}
      />
    </AdminPage>
  );
}
