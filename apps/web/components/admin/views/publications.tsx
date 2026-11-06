"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ExternalLink, FileUp, Plus, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { AdminPage, Badge, Confirm, DataTable, Empty, ErrorNote, Loading, Pager, Panel, Tabs, fmtDate, label, statusTone, useToast } from "@/components/admin/ui";
import { Check, FormGrid, Repeater, RichTextArea, Select, TextInput, focusFirstError } from "@/components/admin/form";
import { SearchBox, uploadMedia } from "@/components/admin/media";
import { researchAreas } from "@/lib/data/research-areas";
import { slugify } from "@/lib/admin/text";
import { qs, send, useApi, type Paged } from "@/lib/admin/use-api";
import { useUrlState } from "@/lib/admin/url-state";

const AREAS: [string, string][] = researchAreas.map((a) => [a.slug, a.shortName]);
const TYPES: [string, string][] = ["Journal article", "Conference paper", "Review"].map((t) => [t, t]);
const areaName = (slug: string) => researchAreas.find((a) => a.slug === slug)?.shortName ?? slug;

interface Row { id: string; slug: string; title: string; authors: { name: string }[]; area: string; type: string; venue: string; publishedOn: string; featured: boolean; status: string }

export function PublicationsView() {
  const url = useUrlState();
  const status = url.get("status");
  const list = useApi<Paged<Row>>(`/admin/publications${qs({ q: url.get("q"), status, area: url.get("area"), page: url.page, pageSize: 25 })}`);
  return (
    <AdminPage
      title="Publications"
      description="Papers shown on /publications and in Featured Research on the homepage."
      actions={
        <Button asChild>
          <Link href="/admin/publications/new">
            <Plus aria-hidden /> Add Publication
          </Link>
        </Button>
      }
    >
      <Tabs
        label="Status"
        tabs={[
          ["", "All"],
          ["published", "Published"],
          ["draft", "Drafts"],
          ["archived", "Archived"],
        ]}
        value={status}
        onChange={(v) => url.set({ status: v })}
      />
      <Panel
        actions={
          <div className="flex w-full flex-col gap-2 sm:flex-row">
            <SearchBox value={url.get("q")} onChange={(q) => url.set({ q })} placeholder="Title, author or keyword…" label="Search publications" />
            <label className="sr-only" htmlFor="pub-area">
              Research area
            </label>
            <select id="pub-area" value={url.get("area")} onChange={(e) => url.set({ area: e.target.value })} className="h-11 rounded-md border border-rule bg-surface px-3 text-sm text-ink md:h-10">
              <option value="">All research areas</option>
              {AREAS.map(([v, l]) => (
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
        {list.data && list.data.items.length === 0 && (
          <Empty
            title={url.get("q") || status || url.get("area") ? "No publications match" : "No publications yet"}
            text="Add journal articles and conference papers by RiTECHS members. They appear on the website once published."
            action={
              <Button asChild size="sm">
                <Link href="/admin/publications/new">
                  <Plus aria-hidden /> Add Publication
                </Link>
              </Button>
            }
          />
        )}
        {list.data && list.data.items.length > 0 && (
          <>
            <DataTable
              caption="Publications"
              rows={list.data.items}
              rowKey={(r) => r.id}
              onRowHref={(r) => `/admin/publications/${r.id}`}
              columns={[
                {
                  key: "title",
                  header: "Title",
                  cell: (r) => (
                    <span className="inline-flex items-start gap-1.5">
                      {r.featured && <Star className="mt-0.5 size-3.5 shrink-0 fill-current" aria-label="Featured" />}
                      {r.title}
                    </span>
                  ),
                },
                { key: "authors", header: "Authors", cell: (r) => r.authors.map((a) => a.name).join(", "), hideBelow: "lg" },
                { key: "area", header: "Area", cell: (r) => areaName(r.area), hideBelow: "md" },
                { key: "date", header: "Published", cell: (r) => fmtDate(r.publishedOn), hideBelow: "sm" },
                { key: "status", header: "Status", cell: (r) => <Badge tone={statusTone(r.status)}>{label(r.status)}</Badge> },
              ]}
            />
            <Pager page={list.data.page} pages={list.data.pages} total={list.data.total} onPage={(p) => url.set({ page: p })} />
          </>
        )}
      </Panel>
    </AdminPage>
  );
}

/* --------------------------------- editor --------------------------------- */

interface Author { name: string; affiliation: string }
interface Form {
  slug: string; title: string; abstract: string; authors: Author[]; area: string; type: string; venue: string; volume: string; doi: string; url: string;
  keywords: string; publishedOn: string; featured: boolean; status: string; pdf: { id: string | null; url: string | null; name?: string };
}
const EMPTY: Form = {
  slug: "", title: "", abstract: "", authors: [{ name: "", affiliation: "" }], area: "ai-ml", type: "Journal article", venue: "", volume: "", doi: "", url: "",
  keywords: "", publishedOn: "", featured: false, status: "draft", pdf: { id: null, url: null },
};
const orNull = (v: string) => (v.trim() ? v.trim() : null);

/* eslint-disable @typescript-eslint/no-explicit-any */
const fromApi = (p: any): Form => ({
  slug: p.slug, title: p.title, abstract: p.abstract, authors: (p.authors ?? []).map((a: any) => ({ name: a.name, affiliation: a.affiliation ?? "" })), area: p.area, type: p.type,
  venue: p.venue, volume: p.volume ?? "", doi: p.doi ?? "", url: p.url ?? "", keywords: (p.keywords ?? []).join(", "), publishedOn: p.publishedOn, featured: !!p.featured,
  status: p.status, pdf: { id: p.pdfId ?? null, url: p.pdfUrl ?? null },
});
/* eslint-enable @typescript-eslint/no-explicit-any */

export function PublicationEditor({ id }: { id: string }) {
  const isNew = id === "new";
  const router = useRouter();
  const toast = useToast();
  const loaded = useApi<unknown>(isNew ? null : `/admin/publications/${id}`);
  const [form, setForm] = useState<Form | null>(isNew ? EMPTY : null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, startSaving] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [del, setDel] = useState(false);
  const pdfInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (loaded.data && !form) {
      const raf = requestAnimationFrame(() => setForm(fromApi(loaded.data)));
      return () => cancelAnimationFrame(raf);
    }
  }, [loaded.data, form]);

  if (loaded.error) return <AdminPage title="Publication"><ErrorNote message={loaded.error.message} onRetry={loaded.reload} /></AdminPage>;
  if (!form) return <AdminPage title="Publication"><Loading /></AdminPage>;
  const set = (patch: Partial<Form>) => setForm({ ...form, ...patch });

  async function pickPdf(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    const res = await uploadMedia(file, "document", form!.title || undefined);
    setUploading(false);
    if (pdfInput.current) pdfInput.current.value = "";
    if (!res.ok) return toast("error", res.message);
    set({ pdf: { id: res.data.id, url: res.data.url, name: file.name } });
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    const f = form!;
    const local: Record<string, string> = {};
    if (!f.title.trim()) local.title = "Enter the title.";
    if (!f.publishedOn) local.publishedOn = "Choose the publication date.";
    if (!f.authors.some((a) => a.name.trim())) local["authors.0.name"] = "Add at least one author.";
    if (Object.keys(local).length) {
      setErrors(local);
      focusFirstError(local);
      return;
    }
    startSaving(async () => {
      const res = await send<{ id: string }>(isNew ? "/admin/publications" : `/admin/publications/${id}`, isNew ? "POST" : "PUT", {
        slug: f.slug.trim() || slugify(f.title).slice(0, 90),
        title: f.title.trim(),
        abstract: f.abstract,
        authors: f.authors.filter((a) => a.name.trim()).map((a) => ({ name: a.name.trim(), ...(a.affiliation.trim() ? { affiliation: a.affiliation.trim() } : {}) })),
        area: f.area,
        type: f.type,
        venue: f.venue.trim(),
        volume: orNull(f.volume),
        doi: orNull(f.doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")),
        url: orNull(f.url),
        pdfId: f.pdf.id,
        keywords: f.keywords.split(",").map((k) => k.trim()).filter(Boolean),
        publishedOn: f.publishedOn,
        featured: f.featured,
        status: f.status,
      });
      if (!res.ok) {
        const fields = res.fields ?? (res.code === "DUPLICATE" ? { slug: "Another publication already uses this web address." } : {});
        setErrors(fields);
        focusFirstError(fields);
        if (!Object.keys(fields).length) toast("error", res.message);
        return;
      }
      setErrors({});
      toast("success", isNew ? "Publication added." : "Publication saved.");
      if (isNew) router.replace(`/admin/publications/${res.data.id}`);
    });
  }

  return (
    <AdminPage
      title={isNew ? "Add Publication" : form.title || "Publication"}
      actions={
        <>
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin/publications">
              <ArrowLeft aria-hidden /> All Publications
            </Link>
          </Button>
          {!isNew && form.status === "published" && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/publications/${form.slug}`} target="_blank" rel="noopener">
                View Page <ExternalLink aria-hidden />
              </Link>
            </Button>
          )}
        </>
      }
    >
      <form onSubmit={save} noValidate className="space-y-6">
        <Panel title="Paper">
          <FormGrid>
            <TextInput id="title" label="Title" value={form.title} onChange={(v) => set({ title: v })} errors={errors} className="sm:col-span-2" />
            <Select id="type" label="Type" value={form.type} onChange={(v) => set({ type: v })} options={TYPES} errors={errors} />
            <Select id="area" label="Research area" value={form.area} onChange={(v) => set({ area: v })} options={AREAS} errors={errors} />
            <TextInput id="venue" label="Journal or conference" value={form.venue} onChange={(v) => set({ venue: v })} errors={errors} placeholder="e.g. IEEE Access…" />
            <TextInput id="volume" label="Volume and pages (optional)" value={form.volume} onChange={(v) => set({ volume: v })} errors={errors} placeholder="e.g. 12, 1034–1047…" />
            <TextInput id="publishedOn" label="Published on" type="date" value={form.publishedOn} onChange={(v) => set({ publishedOn: v })} errors={errors} />
            <TextInput id="doi" label="DOI (optional)" value={form.doi} onChange={(v) => set({ doi: v })} errors={errors} spellCheck={false} placeholder="10.1109/ACCESS.2026.1234567…" />
            <TextInput id="url" label="Link to the paper (optional)" type="url" value={form.url} onChange={(v) => set({ url: v })} errors={errors} placeholder="https://…" className="sm:col-span-2" />
          </FormGrid>
          <div className="mt-4 space-y-4">
            <RichTextArea id="abstract" label="Abstract" value={form.abstract} onChange={(v) => set({ abstract: v })} errors={errors} rows={7} max={5000} />
            <TextInput id="keywords" label="Keywords" value={form.keywords} onChange={(v) => set({ keywords: v })} errors={errors} hint="Separate with commas." placeholder="e.g. intrusion detection, federated learning…" />
          </div>
        </Panel>

        <Panel>
          <Repeater
            title="Authors"
            addLabel="Add Author"
            items={form.authors}
            onChange={(authors) => set({ authors })}
            blank={() => ({ name: "", affiliation: "" })}
            render={(a, up, i) => (
              <FormGrid>
                <TextInput id={`authors.${i}.name`} label="Name" value={a.name} onChange={(v) => up({ name: v })} errors={errors} autoComplete="off" placeholder="e.g. Dr. Nadia Refat…" />
                <TextInput id={`authors.${i}.affiliation`} label="Affiliation (optional)" value={a.affiliation} onChange={(v) => up({ affiliation: v })} errors={errors} placeholder="e.g. University of Wolverhampton…" />
              </FormGrid>
            )}
          />
        </Panel>

        <Panel title="Full Text and Visibility">
          <div className="flex flex-wrap items-center gap-3">
            <input ref={pdfInput} type="file" accept="application/pdf" className="sr-only" id="pdf" aria-label="Upload PDF" onChange={(e) => void pickPdf(e.target.files?.[0])} />
            <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => pdfInput.current?.click()}>
              {uploading ? <Spinner /> : <FileUp aria-hidden />}
              {uploading ? "Uploading…" : form.pdf.id ? "Replace PDF" : "Upload PDF (optional)"}
            </Button>
            {form.pdf.url && (
              <>
                <a href={form.pdf.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-brand hover:underline">
                  {form.pdf.name ?? "Current PDF"}
                </a>
                <Button type="button" variant="ghost" size="sm" onClick={() => set({ pdf: { id: null, url: null } })}>
                  <Trash2 aria-hidden /> Remove
                </Button>
              </>
            )}
          </div>
          <FormGrid className="mt-5">
            <Select id="status" label="Status" value={form.status} onChange={(v) => set({ status: v })} options={[["draft", "Draft (hidden)"], ["published", "Published"], ["archived", "Archived"]]} errors={errors} />
            <TextInput id="slug" label="Web address" value={form.slug} onChange={(v) => set({ slug: v })} errors={errors} hint={`/publications/${form.slug || slugify(form.title).slice(0, 90) || "…"}`} placeholder="Made from the title if left empty…" />
            <div className="sm:col-span-2">
              <Check id="featured" label="Feature on the homepage (Featured Research)" checked={form.featured} onChange={(v) => set({ featured: v })} />
            </div>
          </FormGrid>
        </Panel>

        <div className="sticky bottom-0 z-20 -mx-4 flex flex-wrap items-center justify-between gap-3 border-t border-rule bg-surface px-4 py-3 shadow-[0_-12px_24px_-20px_rgba(32,33,36,0.35)] sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          {!isNew ? (
            <Button type="button" variant="ghost" className="text-destructive" onClick={() => setDel(true)}>
              Delete Publication
            </Button>
          ) : (
            <span />
          )}
          <Button type="submit" disabled={saving}>
            {saving && <Spinner />}
            {saving ? "Saving…" : isNew ? "Add Publication" : "Save Changes"}
          </Button>
        </div>
      </form>
      <Confirm
        open={del}
        onOpenChange={setDel}
        title="Delete this publication?"
        description="It disappears from the website. This cannot be undone; to hide it instead, set it to Archived."
        confirmLabel="Delete Publication"
        pendingLabel="Deleting…"
        destructive
        onConfirm={async () => {
          const res = await send(`/admin/publications/${id}`, "DELETE");
          if (!res.ok) return void toast("error", res.message);
          toast("success", "Publication deleted.");
          router.replace("/admin/publications");
        }}
      />
    </AdminPage>
  );
}
