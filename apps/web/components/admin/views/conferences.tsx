"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download, ExternalLink, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useAdmin } from "@/components/admin/shell";
import { AdminPage, Badge, Confirm, DataTable, Empty, ErrorNote, Loading, Pager, Panel, fmtDate, label, statusTone, useToast } from "@/components/admin/ui";
import { Check, FormGrid, Repeater, Select, TextArea, TextInput, focusFirstError } from "@/components/admin/form";
import { EntityPicker, ORGANISATIONS, PdfField, SPEAKERS, type Picked } from "@/components/admin/pickers";
import { ImageField } from "@/components/admin/media";
import { htmlToText, lines, textToHtml } from "@/lib/admin/text";
import { qs, send, useApi, type Paged } from "@/lib/admin/use-api";
import { useUrlState } from "@/lib/admin/url-state";
import { routes } from "@/lib/site";

interface ConfRow {
  id: string;
  slug: string;
  acronym: string;
  title: string;
  location: string | null;
  startDate: string | null;
  endDate: string | null;
  status: string;
  featured: boolean;
  externalUrl: string | null;
}

export function ConferencesView() {
  const url = useUrlState();
  const [q, setQ] = useState(url.get("q"));
  const list = useApi<Paged<ConfRow>>(`/admin/conferences${qs({ q: url.get("q"), status: url.get("status"), page: url.page, pageSize: 25 })}`);
  return (
    <AdminPage
      title="Conferences"
      description="Conference pages: tracks, important dates, fees, committee, awards and sponsorship."
      actions={
        <Button asChild>
          <Link href="/admin/conferences/new">
            <Plus aria-hidden /> New Conference
          </Link>
        </Button>
      }
    >
      <Panel>
        <form className="grid gap-3 sm:grid-cols-[1fr_auto_auto]" onSubmit={(e) => (e.preventDefault(), url.set({ q }))}>
          <label htmlFor="c-q" className="sr-only">
            Search conferences
          </label>
          <Input id="c-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Title or acronym, e.g. DTISB…" />
          <label htmlFor="c-st" className="sr-only">
            Status
          </label>
          <select id="c-st" className="h-12 rounded-md border border-input bg-surface px-3 text-sm" value={url.get("status")} onChange={(e) => url.set({ status: e.target.value })}>
            <option value="">All statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
          <Button type="submit" variant="outline">
            Search
          </Button>
        </form>
        <div className="mt-5">
          {list.error && <ErrorNote message={list.error.message} onRetry={list.reload} />}
          {list.loading && !list.data && <Loading />}
          {list.data && list.data.items.length === 0 && <Empty title="No conferences" action={<Button asChild size="sm"><Link href="/admin/conferences/new">New Conference</Link></Button>} />}
          {list.data && list.data.items.length > 0 && (
            <>
              <DataTable
                caption="Conferences"
                rows={list.data.items}
                rowKey={(r) => r.id}
                onRowHref={(r) => `/admin/conferences/${r.id}`}
                columns={[
                  { key: "acr", header: "Conference", cell: (r) => r.acronym },
                  { key: "title", header: "Title", cell: (r) => <span className="line-clamp-2">{r.title}</span>, hideBelow: "md" },
                  { key: "dates", header: "Dates", cell: (r) => (r.startDate ? `${fmtDate(r.startDate)}${r.endDate && r.endDate !== r.startDate ? ` – ${fmtDate(r.endDate)}` : ""}` : "—"), hideBelow: "sm" },
                  { key: "status", header: "Status", cell: (r) => <span className="flex flex-wrap gap-1"><Badge tone={statusTone(r.status)}>{label(r.status)}</Badge>{r.featured && <Badge tone="brand">Featured</Badge>}</span> },
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

interface Track { title: string; description: string; scope: string; chairs: string }
interface KeyDate { label: string; date: string }
interface Fee { category: string; earlyAmount: string; regularAmount: string; onlineAmount: string; currency: string; overseasAmount: string; overseasCurrency: string; note: string }
interface Committee { role: string; members: string }
interface Award { title: string; prize: string }
interface Sponsorship { tier: string; price: string; currency: string; availability: string; benefits: string }

interface Form {
  slug: string; acronym: string; title: string; summary: string; objective: string; about: string; joinUs: string; paperSubmission: string;
  highlights: string; cameraReady: string; cameraReadyUrl: string; registrationNote: string;
  /** Formatted HTML as loaded, reused for any text field left unchanged so its formatting survives a save. */
  original: Partial<Record<RichField, { text: string; html: string }>>;
  socialLinks: { network: string; url: string }[];
  publication: string; venue: string; location: string; mode: string; startDate: string; endDate: string; externalUrl: string; submissionUrl: string;
  status: string; featured: boolean;
  tracks: Track[]; dates: KeyDate[]; fees: Fee[]; committee: Committee[]; awards: Award[]; sponsorship: Sponsorship[];
  speakers: Picked[]; sponsors: Picked[];
  /** Poster/banner and call-for-papers PDF: uploaded media, or a file still on the old site. */
  cover: FileState; cfp: FileState; cameraReadyFile: FileState;
}
interface FileState { id: string | null; url: string | null; legacy: boolean; changed: boolean }
const NO_FILE: FileState = { id: null, url: null, legacy: false, changed: false };

type RichField = "about" | "joinUs" | "paperSubmission" | "highlights" | "cameraReady";
const RICH_FIELDS: RichField[] = ["about", "joinUs", "paperSubmission", "highlights", "cameraReady"];

const EMPTY: Form = {
  slug: "", acronym: "", title: "", summary: "", objective: "", about: "", joinUs: "", paperSubmission: "",
  highlights: "", cameraReady: "", cameraReadyUrl: "", registrationNote: "", original: {}, socialLinks: [], publication: "", venue: "", location: "", mode: "in-person",
  startDate: "", endDate: "", externalUrl: "", submissionUrl: "", status: "draft", featured: false, tracks: [], dates: [], fees: [], committee: [], awards: [], sponsorship: [], speakers: [], sponsors: [], cover: NO_FILE, cfp: NO_FILE, cameraReadyFile: NO_FILE,
};

/* eslint-disable @typescript-eslint/no-explicit-any */
function fromApi(c: any): Form {
  const s = (v: unknown) => (v == null ? "" : String(v));
  const original: Form["original"] = {};
  for (const k of RICH_FIELDS) if (c[k]) original[k] = { text: htmlToText(c[k]), html: c[k] };
  return {
    slug: c.slug, acronym: c.acronym, title: c.title, summary: s(c.summary), objective: s(c.objective), about: htmlToText(c.about), joinUs: htmlToText(c.joinUs), paperSubmission: htmlToText(c.paperSubmission),
    highlights: htmlToText(c.highlights), cameraReady: htmlToText(c.cameraReady), cameraReadyUrl: s(c.cameraReadyUrl), registrationNote: s(c.registrationNote), original, socialLinks: c.socialLinks ?? [],
    publication: (c.publication ?? []).join("\n"), venue: s(c.venue), location: s(c.location), mode: c.mode, startDate: s(c.startDate), endDate: s(c.endDate), externalUrl: s(c.externalUrl), submissionUrl: s(c.submissionUrl),
    status: c.status, featured: !!c.featured,
    tracks: c.tracks.map((t: any) => ({ title: t.title, description: s(t.description), scope: s(t.scope), chairs: (t.chairs ?? []).join("\n") })),
    dates: c.dates.map((d: any) => ({ label: d.label, date: d.date })),
    fees: c.fees.map((f: any) => ({ category: f.category, earlyAmount: s(f.earlyAmount), regularAmount: s(f.regularAmount), onlineAmount: s(f.onlineAmount), currency: f.currency, overseasAmount: s(f.overseasAmount), overseasCurrency: s(f.overseasCurrency), note: s(f.note) })),
    committee: c.committee.map((g: any) => ({ role: g.role, members: (g.members ?? []).join("\n") })),
    awards: c.awards.map((a: any) => ({ title: a.title, prize: a.prize })),
    sponsorship: c.sponsorship.map((p: any) => ({ tier: p.tier, price: s(p.price), currency: p.currency, availability: s(p.availability), benefits: (p.benefits ?? []).join("\n") })),
    speakers: c.speakers.map((x: any) => ({ id: x.id, name: x.name, sub: [x.designation, x.organisation].filter(Boolean).join(", ") || null, image: x.photoUrl, tag: x.role ?? "keynote" })),
    sponsors: c.sponsors.map((x: any) => ({ id: x.id, name: x.name, image: x.logoUrl, tag: x.tier ?? "" })),
    cover: { id: c.coverId ?? null, url: c.coverUrl ?? null, legacy: !c.coverId && !!c.coverUrl, changed: false },
    cfp: { id: c.callForPapersId ?? null, url: c.callForPapersUrl ?? null, legacy: !c.callForPapersId && !!c.callForPapersUrl, changed: false },
    cameraReadyFile: { id: null, url: c.cameraReadyFileUrl ?? null, legacy: !!c.cameraReadyFileUrl, changed: false },
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

const money = (v: string) => (v.trim() === "" ? null : v.replace(/[^\d.]/g, ""));
const orNull = (v: string) => (v.trim() ? v.trim() : null);

function toApi(f: Form) {
  const rich = (k: RichField) => {
    const text = f[k];
    if (!text.trim()) return null;
    const o = f.original[k];
    return o && o.text === text ? o.html : textToHtml(text);
  };
  return {
    slug: f.slug.trim(), acronym: f.acronym.trim(), title: f.title.trim(), summary: orNull(f.summary), objective: orNull(f.objective),
    about: rich("about"), joinUs: rich("joinUs"), paperSubmission: rich("paperSubmission"), highlights: rich("highlights"), cameraReady: rich("cameraReady"),
    cameraReadyUrl: orNull(f.cameraReadyUrl), registrationNote: orNull(f.registrationNote),
    publication: lines(f.publication), venue: orNull(f.venue), location: orNull(f.location), mode: f.mode, startDate: orNull(f.startDate), endDate: orNull(f.endDate),
    externalUrl: orNull(f.externalUrl), submissionUrl: orNull(f.submissionUrl), status: f.status, featured: f.featured,
    tracks: f.tracks.map((t) => ({ title: t.title.trim(), description: orNull(t.description), scope: orNull(t.scope), chairs: lines(t.chairs) })),
    dates: f.dates.map((d) => ({ label: d.label.trim(), date: d.date })),
    fees: f.fees.map((x) => ({ category: x.category.trim(), earlyAmount: money(x.earlyAmount), regularAmount: money(x.regularAmount), onlineAmount: money(x.onlineAmount), currency: x.currency || "USD", overseasAmount: money(x.overseasAmount), overseasCurrency: orNull(x.overseasCurrency), note: orNull(x.note) })),
    committee: f.committee.map((g) => ({ role: g.role.trim(), members: lines(g.members) })),
    awards: f.awards.map((a) => ({ title: a.title.trim(), prize: a.prize.trim() })),
    sponsorship: f.sponsorship.map((p) => ({ tier: p.tier.trim(), price: money(p.price) ?? "0", currency: p.currency || "USD", availability: orNull(p.availability), benefits: lines(p.benefits) })),
    speakerIds: f.speakers.map((x) => ({ id: x.id, role: x.tag || "speaker" })),
    sponsorIds: f.sponsors.map((x) => ({ id: x.id, tier: x.tag?.trim() || null })),
    socialLinks: f.socialLinks.filter((l) => l.url.trim()).map((l) => ({ network: l.network, url: l.url.trim() })),
    // Files: send only what changed. Removing a file that came from the old site clears its old path.
    ...(f.cover.changed ? { coverId: f.cover.id, ...(f.cover.id === null ? { legacyCoverPath: null } : {}) } : {}),
    ...(f.cfp.changed ? { callForPapersId: f.cfp.id, ...(f.cfp.id === null ? { legacyCallForPapersPath: null } : {}) } : {}),
    ...(f.cameraReadyFile.changed && !f.cameraReadyFile.url ? { legacyCameraReadyPath: null } : {}),
  };
}

const TEXT_HINT = "Leave a blank line between paragraphs. Start lines with “- ” for a bullet list.";

export function ConferenceEditor({ id }: { id: string }) {
  const isNew = id === "new";
  const me = useAdmin();
  const router = useRouter();
  const toast = useToast();
  const loaded = useApi<unknown>(isNew ? null : `/admin/conferences/${id}`);
  const regs = useApi<Paged<unknown>>(isNew ? null : `/admin/conferences/${id}/registrations?pageSize=1`);
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

  if (loaded.error) return <AdminPage title="Conference"><ErrorNote message={loaded.error.message} onRetry={loaded.reload} /></AdminPage>;
  if (!form) return <AdminPage title="Conference"><Loading /></AdminPage>;
  const set = (patch: Partial<Form>) => setForm({ ...form, ...patch });

  function save(e: React.FormEvent) {
    e.preventDefault();
    startSaving(async () => {
      const res = await send<{ id: string }>(isNew ? "/admin/conferences" : `/admin/conferences/${id}`, isNew ? "POST" : "PUT", toApi(form!));
      if (!res.ok) {
        const fields = res.fields ?? (res.code === "SLUG_TAKEN" ? { slug: res.message } : {});
        setErrors(fields);
        focusFirstError(fields);
        toast("error", res.message);
        return;
      }
      setErrors({});
      toast("success", isNew ? "Conference created." : "Changes saved. The public page updates within a minute.");
      if (isNew) router.replace(`/admin/conferences/${res.data.id}`);
      else setForm(fromApi(res.data));
    });
  }

  return (
    <AdminPage
      title={isNew ? "New Conference" : form.acronym || "Conference"}
      actions={
        <>
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin/conferences">
              <ArrowLeft aria-hidden /> All Conferences
            </Link>
          </Button>
          {!isNew && form.status === "published" && (
            <Button asChild variant="outline" size="sm">
              <Link href={routes.conference(form.slug)} target="_blank" rel="noopener">
                View Page <ExternalLink aria-hidden />
              </Link>
            </Button>
          )}
        </>
      }
    >
      <form onSubmit={save} noValidate className="space-y-6">
        <Panel title="Basics">
          <FormGrid>
            <TextInput id="acronym" label="Acronym" value={form.acronym} onChange={(v) => set({ acronym: v })} errors={errors} placeholder="e.g. DTISB-2027…" />
            <TextInput id="slug" label="Web address" value={form.slug} onChange={(v) => set({ slug: v })} errors={errors} hint={`ritechs.org/conferences/${form.slug || "…"}`} placeholder="e.g. DTISB-2027…" onFocus={() => !form.slug && form.acronym && set({ slug: form.acronym.replace(/\s+/g, "-") })} />
            <TextInput id="title" label="Full title" value={form.title} onChange={(v) => set({ title: v })} errors={errors} className="sm:col-span-2" />
            <TextInput id="startDate" label="Starts" type="date" value={form.startDate} onChange={(v) => set({ startDate: v })} errors={errors} />
            <TextInput id="endDate" label="Ends" type="date" value={form.endDate} onChange={(v) => set({ endDate: v })} errors={errors} />
            <TextInput id="location" label="Location" value={form.location} onChange={(v) => set({ location: v })} errors={errors} placeholder="e.g. University of Leeds, UK…" />
            <Select id="mode" label="Format" value={form.mode} onChange={(v) => set({ mode: v })} options={[["in-person", "In person"], ["hybrid", "Hybrid"], ["online", "Online"]]} />
            <TextInput id="submissionUrl" label="Paper submission link" type="url" value={form.submissionUrl} onChange={(v) => set({ submissionUrl: v })} errors={errors} placeholder="https://cmt3.research.microsoft.com/…" />
            <TextInput id="externalUrl" label="External website (optional)" type="url" value={form.externalUrl} onChange={(v) => set({ externalUrl: v })} errors={errors} hint="Only when the conference has its own site; the listing then links there." />
            <Select id="status" label="Status" value={form.status} onChange={(v) => set({ status: v })} options={[["draft", "Draft (hidden)"], ["published", "Published"], ["archived", "Archived"]]} />
            <div className="flex items-end">
              <Check id="featured" label="Feature on the homepage" checked={form.featured} onChange={(v) => set({ featured: v })} />
            </div>
          </FormGrid>
        </Panel>

        <Panel title="Text">
          <div className="space-y-4">
            <TextArea id="summary" label="Short summary" value={form.summary} onChange={(v) => set({ summary: v })} errors={errors} rows={2} />
            <TextArea id="highlights" label="Highlights" value={form.highlights} onChange={(v) => set({ highlights: v })} errors={errors} hint={`Shown at the top, e.g. publisher and indexing. ${TEXT_HINT}`} rows={4} />
            <TextArea id="about" label="Introduction" value={form.about} onChange={(v) => set({ about: v })} errors={errors} hint={TEXT_HINT} rows={6} />
            <TextArea id="objective" label="Objective" value={form.objective} onChange={(v) => set({ objective: v })} errors={errors} rows={4} />
            <TextArea id="publication" label="Publication" value={form.publication} onChange={(v) => set({ publication: v })} errors={errors} hint="One line per item, e.g. “Springer proceedings (Scopus-indexed)”." rows={3} />
            <TextArea id="joinUs" label="Join us" value={form.joinUs} onChange={(v) => set({ joinUs: v })} errors={errors} hint={TEXT_HINT} rows={4} />
            <TextArea id="paperSubmission" label="Paper submission guide" value={form.paperSubmission} onChange={(v) => set({ paperSubmission: v })} errors={errors} hint={TEXT_HINT} rows={6} />
            <TextArea id="cameraReady" label="Camera-ready instructions" value={form.cameraReady} onChange={(v) => set({ cameraReady: v })} errors={errors} hint={TEXT_HINT} rows={4} />
            <TextInput id="cameraReadyUrl" label="Camera-ready link (optional)" type="url" value={form.cameraReadyUrl} onChange={(v) => set({ cameraReadyUrl: v })} errors={errors} placeholder="https://ecopyright.ieee.org/…" />
            <TextArea id="registrationNote" label="Note above the fees" value={form.registrationNote} onChange={(v) => set({ registrationNote: v })} errors={errors} rows={2} />
          </div>
        </Panel>

        <Panel>
          <Repeater title="Tracks" addLabel="Add Track" items={form.tracks} onChange={(tracks) => set({ tracks })} blank={() => ({ title: "", description: "", scope: "", chairs: "" })} render={(t, up, i) => (
            <FormGrid>
              <TextInput id={`tracks.${i}.title`} label="Title" value={t.title} onChange={(v) => up({ title: v })} errors={errors} className="sm:col-span-2" />
              <TextArea id={`tracks.${i}.description`} label="Description" value={t.description} onChange={(v) => up({ description: v })} rows={3} />
              <TextArea id={`tracks.${i}.scope`} label="Scope" value={t.scope} onChange={(v) => up({ scope: v })} rows={3} />
              <TextArea id={`tracks.${i}.chairs`} label="Track chairs" value={t.chairs} onChange={(v) => up({ chairs: v })} hint="One per line." rows={3} className="sm:col-span-2" />
            </FormGrid>
          )} />
        </Panel>

        <Panel>
          <Repeater title="Important Dates" addLabel="Add Date" items={form.dates} onChange={(dates) => set({ dates })} blank={() => ({ label: "", date: "" })} render={(d, up, i) => (
            <FormGrid>
              <TextInput id={`dates.${i}.label`} label="What" value={d.label} onChange={(v) => up({ label: v })} errors={errors} placeholder="e.g. Full paper deadline…" />
              <TextInput id={`dates.${i}.date`} label="Date" type="date" value={d.date} onChange={(v) => up({ date: v })} errors={errors} />
            </FormGrid>
          )} />
        </Panel>

        <Panel>
          <Repeater title="Registration Fees" addLabel="Add Fee" items={form.fees} onChange={(fees) => set({ fees })} blank={() => ({ category: "", earlyAmount: "", regularAmount: "", onlineAmount: "", currency: "USD", overseasAmount: "", overseasCurrency: "", note: "" })} render={(f, up, i) => (
            <FormGrid className="lg:grid-cols-4">
              <TextInput id={`fees.${i}.category`} label="Category" value={f.category} onChange={(v) => up({ category: v })} errors={errors} className="sm:col-span-2 lg:col-span-3" />
              <TextInput id={`fees.${i}.currency`} label="Currency" value={f.currency} onChange={(v) => up({ currency: v.toUpperCase().slice(0, 3) })} errors={errors} />
              <TextInput id={`fees.${i}.earlyAmount`} label="Early-bird" inputMode="decimal" value={f.earlyAmount} onChange={(v) => up({ earlyAmount: v })} errors={errors} />
              <TextInput id={`fees.${i}.regularAmount`} label="Regular" inputMode="decimal" value={f.regularAmount} onChange={(v) => up({ regularAmount: v })} errors={errors} />
              <TextInput id={`fees.${i}.onlineAmount`} label="Online" inputMode="decimal" value={f.onlineAmount} onChange={(v) => up({ onlineAmount: v })} errors={errors} />
              <TextInput id={`fees.${i}.overseasAmount`} label="Overseas (if different)" inputMode="decimal" value={f.overseasAmount} onChange={(v) => up({ overseasAmount: v })} errors={errors} />
              <TextInput id={`fees.${i}.overseasCurrency`} label="Overseas currency" value={f.overseasCurrency} onChange={(v) => up({ overseasCurrency: v.toUpperCase().slice(0, 3) })} errors={errors} placeholder="e.g. USD…" />
              <TextInput id={`fees.${i}.note`} label="Note" value={f.note} onChange={(v) => up({ note: v })} errors={errors} />
            </FormGrid>
          )} />
        </Panel>

        <Panel>
          <Repeater title="Organising Committee" addLabel="Add Role" items={form.committee} onChange={(committee) => set({ committee })} blank={() => ({ role: "", members: "" })} render={(g, up, i) => (
            <FormGrid>
              <TextInput id={`committee.${i}.role`} label="Role" value={g.role} onChange={(v) => up({ role: v })} errors={errors} placeholder="e.g. General Chairs…" />
              <TextArea id={`committee.${i}.members`} label="People" value={g.members} onChange={(v) => up({ members: v })} hint="One per line, e.g. “Prof A, University of Leeds”." rows={4} />
            </FormGrid>
          )} />
        </Panel>

        <Panel>
          <Repeater title="Awards" addLabel="Add Award" items={form.awards} onChange={(awards) => set({ awards })} blank={() => ({ title: "", prize: "" })} render={(a, up, i) => (
            <FormGrid>
              <TextInput id={`awards.${i}.title`} label="Award" value={a.title} onChange={(v) => up({ title: v })} errors={errors} />
              <TextInput id={`awards.${i}.prize`} label="Prize" value={a.prize} onChange={(v) => up({ prize: v })} errors={errors} placeholder="e.g. $500…" />
            </FormGrid>
          )} />
        </Panel>

        <Panel>
          <Repeater title="Sponsorship Packages" addLabel="Add Package" items={form.sponsorship} onChange={(sponsorship) => set({ sponsorship })} blank={() => ({ tier: "", price: "", currency: "USD", availability: "", benefits: "" })} render={(p, up, i) => (
            <FormGrid className="lg:grid-cols-3">
              <TextInput id={`sponsorship.${i}.tier`} label="Tier" value={p.tier} onChange={(v) => up({ tier: v })} errors={errors} />
              <TextInput id={`sponsorship.${i}.price`} label="Price" inputMode="decimal" value={p.price} onChange={(v) => up({ price: v })} errors={errors} />
              <TextInput id={`sponsorship.${i}.currency`} label="Currency" value={p.currency} onChange={(v) => up({ currency: v.toUpperCase().slice(0, 3) })} errors={errors} />
              <TextInput id={`sponsorship.${i}.availability`} label="Availability" value={p.availability} onChange={(v) => up({ availability: v })} errors={errors} className="sm:col-span-2 lg:col-span-3" placeholder="e.g. Limited: 2 sponsors…" />
              <TextArea id={`sponsorship.${i}.benefits`} label="Benefits" value={p.benefits} onChange={(v) => up({ benefits: v })} hint="One per line." rows={4} className="sm:col-span-2 lg:col-span-3" />
            </FormGrid>
          )} />
        </Panel>

        <Panel title="Speakers and Sponsors">
          <div className="grid gap-8 lg:grid-cols-2">
            <EntityPicker
              label="Speakers"
              noun="speaker"
              source={SPEAKERS}
              value={form.speakers}
              onChange={(speakers) => set({ speakers })}
              tagLabel="Role"
              tagOptions={[["keynote", "Keynote"], ["speaker", "Speaker"], ["invited", "Invited talk"], ["panelist", "Panellist"], ["chair", "Session chair"]]}
              manageHref="/admin/speakers"
            />
            <EntityPicker
              label="Sponsors and partners"
              noun="organisation"
              source={ORGANISATIONS}
              value={form.sponsors}
              onChange={(sponsors) => set({ sponsors })}
              tagLabel="Tier"
              tagPlaceholder="Tier, e.g. Gold…"
              fit="contain"
              manageHref="/admin/organisations"
            />
          </div>
        </Panel>

        <Panel title="Files and Social Links">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-5">
              <ImageField
                label="Conference poster or banner"
                purpose="cover"
                fit="contain"
                url={form.cover.url}
                name={form.acronym}
                onChange={(v) => set({ cover: { ...v, legacy: false, changed: true } })}
                hint={form.cover.legacy ? "This image is still on the old website. Upload a new one to replace it." : "Shown beside the conference page. JPG, PNG or WebP."}
              />
              <PdfField label="Call for papers (PDF)" url={form.cfp.url} onChange={(v) => set({ cfp: { ...v, legacy: false, changed: true } })} hint={form.cfp.legacy ? "This PDF is still on the old website." : "Offered as a download on the conference page."} />
              {form.cameraReadyFile.url && (
                <div>
                  <p className="text-sm font-medium text-ink">Camera-ready guidelines (PDF from the old website)</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <a href={form.cameraReadyFile.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-brand hover:underline">
                      Current file
                    </a>
                    <Button type="button" variant="ghost" size="sm" onClick={() => set({ cameraReadyFile: { ...NO_FILE, changed: true } })}>
                      Remove
                    </Button>
                  </div>
                </div>
              )}
            </div>
            <Repeater
              title="Social media pages"
              addLabel="Add Link"
              items={form.socialLinks}
              onChange={(socialLinks) => set({ socialLinks })}
              blank={() => ({ network: "facebook", url: "" })}
              render={(l, up, i) => (
                <FormGrid>
                  <Select id={`socialLinks.${i}.network`} label="Network" value={l.network} onChange={(v) => up({ network: v })} options={[["facebook", "Facebook"], ["linkedin", "LinkedIn"], ["twitter", "X (Twitter)"], ["youtube", "YouTube"], ["instagram", "Instagram"], ["website", "Website"]]} />
                  <TextInput id={`socialLinks.${i}.url`} label="Address" type="url" value={l.url} onChange={(v) => up({ url: v })} errors={errors} placeholder="https://…" />
                </FormGrid>
              )}
            />
          </div>
        </Panel>

        {!isNew && (
          <Panel title="Registrations">
            <p className="text-sm text-muted-ink">
              {regs.data ? `${regs.data.total} registration${regs.data.total === 1 ? "" : "s"} of interest.` : "Loading…"} All sign-ups are also listed under Registrations.
            </p>

            {regs.data && regs.data.total > 0 && (
              <Button asChild variant="outline" size="sm" className="mt-3">
                <a href={`/api/admin/conferences/${id}/registrations.csv`} download>
                  <Download aria-hidden /> Download CSV
                </a>
              </Button>
            )}
          </Panel>
        )}

        <div className="sticky bottom-0 z-20 -mx-4 flex flex-wrap items-center justify-between gap-3 border-t border-rule bg-surface px-4 py-3 shadow-[0_-12px_24px_-20px_rgba(32,33,36,0.35)] sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          {!isNew && me.role === "admin" ? (
            <Button type="button" variant="ghost" className="text-destructive" onClick={() => setDel(true)}>
              Delete Conference
            </Button>
          ) : (
            <span />
          )}
          <Button type="submit" disabled={saving}>
            {saving && <Spinner />}
            {saving ? "Saving…" : isNew ? "Create Conference" : "Save Changes"}
          </Button>
        </div>
      </form>
      <Confirm
        open={del}
        onOpenChange={setDel}
        title="Delete This Conference?"
        description="The page and all its sections are removed. Registrations for it are deleted too. This cannot be undone — consider setting the status to Archived instead."
        confirmLabel="Delete Permanently"
        pendingLabel="Deleting…"
        destructive
        onConfirm={async () => {
          const res = await send(`/admin/conferences/${id}`, "DELETE");
          if (!res.ok) {
            toast("error", res.message);
            return true;
          }
          toast("success", "Conference deleted.");
          router.replace("/admin/conferences");
        }}
      />
    </AdminPage>
  );
}

