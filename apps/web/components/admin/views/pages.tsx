"use client";

import { uploadEditorImage } from "@/components/admin/media";
import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ExternalLink, Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { AdminPage, Badge, Confirm, Empty, ErrorNote, Loading, Panel, fmtDate, useToast } from "@/components/admin/ui";
import { FormGrid, RichTextArea, Select, TextArea, TextInput, focusFirstError } from "@/components/admin/form";
import { SITE_PAGES, pageHref, sitePage } from "@/lib/content/site-pages";
import { slugify } from "@/lib/admin/text";
import { apiRaw } from "@/lib/api/client";
import { send, useApi } from "@/lib/admin/use-api";
import { cn } from "@/lib/utils";

interface Row { id: string; slug: string; title: string; status: string; legacyId: number | null; updatedAt: string }

/** What a designed page currently shows, given its row in the database (if any). */
function Showing({ row }: { row?: Row }) {
  if (!row) return <Badge>Designed version</Badge>;
  if (row.status === "published") return <Badge tone="success">Edited version</Badge>;
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <Badge>Designed version</Badge>
      <Badge tone="warning">{row.legacyId ? "Old-site text in draft" : "Edit in draft"}</Badge>
    </span>
  );
}

export function PagesView() {
  const list = useApi<Row[]>("/admin/pages");
  const rows = new Map((list.data ?? []).map((r) => [r.slug, r]));
  const custom = (list.data ?? []).filter((r) => !sitePage(r.slug));
  const sections = [...new Set(SITE_PAGES.map((p) => p.section))];

  return (
    <AdminPage
      title="Website Pages"
      description="The text of the website's information pages. Each page keeps its designed layout until you publish an edited version, which then replaces its text. Restoring brings the designed version back."
      actions={
        <Button asChild>
          <Link href="/admin/pages/new">
            <Plus aria-hidden /> Add New Page
          </Link>
        </Button>
      }
    >
      {list.error && <ErrorNote message={list.error.message} onRetry={list.reload} />}
      {!list.data && !list.error && <Loading />}
      {list.data && (
        <>
          {sections.map((section) => (
            <Panel key={section} title={section}>
              <ul className="-my-3 divide-y divide-rule">
                {SITE_PAGES.filter((p) => p.section === section).map((p) => {
                  const row = rows.get(p.slug);
                  return (
                    <li key={p.slug} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
                      <span className="min-w-0 flex-1 basis-56">
                        <Link href={`/admin/pages/${p.slug}`} className="font-medium text-brand underline-offset-4 hover:underline">
                          {row?.status === "published" ? row.title : p.title}
                        </Link>
                        <a href={p.href} target="_blank" rel="noopener" className="mt-0.5 flex items-center gap-1 text-xs text-muted-ink hover:text-brand">
                          {p.href} <ExternalLink className="size-3" aria-hidden />
                        </a>
                      </span>
                      <Showing row={row} />
                      <span className="w-28 text-right text-xs text-faint-ink">{row ? fmtDate(row.updatedAt) : ""}</span>
                    </li>
                  );
                })}
              </ul>
            </Panel>
          ))}

          <Panel
            title="Other Pages"
            actions={
              <Button asChild size="sm" variant="outline">
                <Link href="/admin/pages/new">
                  <Plus aria-hidden /> Add New Page
                </Link>
              </Button>
            }
          >
            {custom.length === 0 ? (
              <Empty title="No other pages" text="Pages you add here appear at ritechs.org/pages/<address>. Link to them from a news article, a conference or an email." />
            ) : (
              <ul className="-my-3 divide-y divide-rule">
                {custom.map((r) => (
                  <li key={r.slug} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
                    <span className="min-w-0 flex-1 basis-56">
                      <Link href={`/admin/pages/${r.slug}`} className="font-medium text-brand underline-offset-4 hover:underline">
                        {r.title}
                      </Link>
                      <span className="mt-0.5 block text-xs text-muted-ink">{pageHref(r.slug)}</span>
                    </span>
                    {r.status === "published" ? <Badge tone="success">Published</Badge> : <Badge tone="warning">{r.legacyId ? "Old-site page, draft" : "Draft"}</Badge>}
                    <span className="w-28 text-right text-xs text-faint-ink">{fmtDate(r.updatedAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </>
      )}
    </AdminPage>
  );
}

/* --------------------------------- editor --------------------------------- */

interface Saved { slug: string; title: string; intro: string | null; body: string; metaDescription: string | null; status: string; legacyId: number | null; updatedAt: string }
interface Form { slug: string; title: string; intro: string; text: string; html: string; mode: "text" | "html"; metaDescription: string; status: string }

/** Formatting the simple editor can't represent (headings, links, bold, images, tables). */
/** Pages using HTML the editor cannot edit (tables, figures, code) open in the HTML view. */
const RAW_ONLY = /<(table|figure|pre|code|h4|iframe)\b/i;

export function PageEditor({ slug: param }: { slug: string }) {
  const isNew = param === "new";
  const builtIn = isNew ? undefined : sitePage(param);
  const router = useRouter();
  const toast = useToast();
  const loaded = useApi<Saved>(isNew ? null : `/admin/pages/${param}`);
  const [form, setForm] = useState<Form | null>(isNew ? { slug: "", title: "", intro: "", text: "", html: "", mode: "text", metaDescription: "", status: "draft" } : null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, startSaving] = useTransition();
  const [confirm, setConfirm] = useState(false);
  const exists = !!loaded.data;

  useEffect(() => {
    if (form || isNew) return;
    const p = loaded.data;
    // A designed page with no edited version yet starts empty, titled like the page.
    if (!p && loaded.error?.status !== 404) return;
    const raf = requestAnimationFrame(() =>
      setForm(
        p
          ? { slug: p.slug, title: p.title, intro: p.intro ?? "", text: p.body, html: p.body, mode: RAW_ONLY.test(p.body) ? "html" : "text", metaDescription: p.metaDescription ?? "", status: p.status }
          : { slug: param, title: builtIn?.title ?? param, intro: "", text: "", html: "", mode: "text", metaDescription: "", status: "draft" },
      ),
    );
    return () => cancelAnimationFrame(raf);
  }, [loaded.data, loaded.error, form, isNew, param, builtIn]);

  if (loaded.error && loaded.error.status !== 404) return <AdminPage title="Page"><ErrorNote message={loaded.error.message} onRetry={loaded.reload} /></AdminPage>;
  if (!form) return <AdminPage title="Page"><Loading /></AdminPage>;
  const set = (patch: Partial<Form>) => setForm({ ...form, ...patch });

  const switchMode = (mode: Form["mode"]) => {
    if (mode === form.mode) return;
    // Text → HTML keeps everything; HTML → text drops formatting the simple editor can't show, so it starts from the HTML's text.
    set(mode === "html" ? { mode, html: form.text } : { mode, text: form.html });
  };

  function save(e: React.FormEvent) {
    e.preventDefault();
    const f = form!;
    const body = (f.mode === "html" ? f.html : f.text).trim();
    const local: Record<string, string> = {};
    if (!f.title.trim()) local.title = "Enter the page title.";
    if (f.status === "published" && !body) local[f.mode === "html" ? "html" : "text"] = "Write the page text before publishing.";
    if (Object.keys(local).length) {
      setErrors(local);
      focusFirstError(local);
      return;
    }
    const slug = isNew ? f.slug.trim() || slugify(f.title).slice(0, 80) : param;
    if (isNew && sitePage(slug)) {
      setErrors({ slug: "That address belongs to one of the website's designed pages. Edit it from the list instead." });
      return;
    }
    startSaving(async () => {
      if (isNew) {
        // Saving is an upsert by address, so make sure a new page doesn't replace an existing one.
        const existing = await apiRaw(`/admin/pages/${encodeURIComponent(slug)}`);
        if (existing.ok) {
          setErrors({ slug: "Another page already uses this address. Choose a different one." });
          focusFirstError({ slug: "x" });
          return;
        }
      }
      const res = await send<Saved>("/admin/pages", "PUT", { slug, title: f.title.trim(), intro: f.intro || null, body, metaDescription: f.metaDescription.trim() || null, status: f.status });
      if (!res.ok) {
        setErrors(res.fields ?? {});
        focusFirstError(res.fields ?? {});
        if (!res.fields) toast("error", res.message);
        return;
      }
      setErrors({});
      toast("success", f.status === "published" ? "Published. The website shows this version now." : "Saved as a draft. The website still shows the current version.");
      if (isNew) router.replace(`/admin/pages/${slug}`);
      else void loaded.reload();
    });
  }

  const href = pageHref(isNew ? form.slug || slugify(form.title) : param);
  const textError = errors[form.mode === "html" ? "html" : "text"] ?? errors.body;

  return (
    <AdminPage
      title={isNew ? "Add New Page" : form.title || "Page"}
      description={
        builtIn
          ? "Publishing replaces the text of this designed page with what you write here (the menu and sidebar stay). Restore the designed version at any time."
          : "A page of its own at the address below. Link to it from the website, a news article or an email."
      }
      actions={
        <>
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin/pages">
              <ArrowLeft aria-hidden /> All Pages
            </Link>
          </Button>
          {!isNew && (
            <Button asChild variant="outline" size="sm">
              <a href={href} target="_blank" rel="noopener">
                View Page <ExternalLink aria-hidden />
              </a>
            </Button>
          )}
        </>
      }
    >
      {loaded.data?.legacyId && loaded.data.status !== "published" && (
        <p className="rounded-lg border border-warning/25 bg-warning-wash px-4 py-3 text-sm text-ink">
          This draft holds the text of the same page on the old website, brought over by the data import. Check it, edit it, then publish it to use it.
        </p>
      )}
      <form onSubmit={save} noValidate className="space-y-6">
        <Panel title="Page">
          <FormGrid>
            <TextInput id="title" label="Title" value={form.title} onChange={(v) => set({ title: v })} errors={errors} />
            {isNew ? (
              <TextInput id="slug" label="Web address" value={form.slug} onChange={(v) => set({ slug: v.toLowerCase() })} errors={errors} hint={`ritechs.org/pages/${form.slug || slugify(form.title).slice(0, 80) || "…"}`} placeholder="Made from the title if left empty…" />
            ) : (
              <div>
                <p className="text-sm font-medium text-ink">Web address</p>
                <p className="mt-2.5 text-[0.9375rem] text-muted-ink">ritechs.org{href}</p>
              </div>
            )}
            <RichTextArea id="intro" label="Introduction (optional)" value={form.intro} onChange={(v) => set({ intro: v })} errors={errors} rows={2} max={1000} className="sm:col-span-2" hint="One or two sentences shown under the title." />
          </FormGrid>
        </Panel>

        <Panel
          title="Text"
          actions={
            <div role="radiogroup" aria-label="Editor" className="inline-flex rounded-md border border-rule p-0.5">
              {(
                [
                  ["text", "Editor"],
                  ["html", "HTML"],
                ] as const
              ).map(([m, l]) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={form.mode === m}
                  onClick={() => switchMode(m)}
                  className={cn("min-h-9 rounded-[5px] px-3 text-sm", form.mode === m ? "bg-brand text-white" : "text-muted-ink hover:text-ink")}
                >
                  {l}
                </button>
              ))}
            </div>
          }
        >
          {form.mode === "text" ? (
            <RichTextArea id="text" label="Page text" variant="full" value={form.text} onChange={(v) => set({ text: v })} errors={{ text: textError ?? "" }} rows={18} onUploadImage={uploadEditorImage} hint="For tables or anything the toolbar cannot do, switch to HTML." />
          ) : (
            <TextArea id="html" label="Page HTML" value={form.html} onChange={(v) => set({ html: v })} errors={{ html: textError ?? "" }} rows={18} hint="Allowed: headings (h2–h4), paragraphs, lists, links, bold and italic, images, tables, quotes. Anything else (scripts, styles) is removed when you save." />
          )}
        </Panel>

        <Panel title="Publishing">
          <FormGrid>
            <Select id="status" label="Status" value={form.status} onChange={(v) => set({ status: v })} options={[["draft", builtIn ? "Draft (the website keeps the current version)" : "Draft (hidden)"], ["published", builtIn ? "Published (replaces the designed text)" : "Published"]]} errors={errors} />
            <TextInput id="metaDescription" label="Search engine description (optional)" value={form.metaDescription} onChange={(v) => set({ metaDescription: v })} errors={errors} hint="Shown by Google under the page title. About 150 characters." />
          </FormGrid>
        </Panel>

        {exists && loaded.data!.body && (
          <Panel title="Saved Version">
            <div className="max-h-[32rem] overflow-y-auto rounded-md border border-rule bg-paper p-5">
              {/* The API sanitised this HTML when it was saved. */}
              <div className="prose-ritechs max-w-none text-[0.9375rem] leading-relaxed text-ink [&_a]:text-brand [&_a]:underline [&_h2]:mt-5 [&_h2]:font-serif [&_h2]:text-xl [&_h3]:mt-4 [&_h3]:font-medium [&_li]:ml-5 [&_li]:list-disc [&_p]:mt-3" dangerouslySetInnerHTML={{ __html: loaded.data!.body }} />
            </div>
          </Panel>
        )}

        <div className="sticky bottom-0 z-20 -mx-4 flex flex-wrap items-center justify-between gap-3 border-t border-rule bg-surface px-4 py-3 shadow-[0_-12px_24px_-20px_rgba(32,33,36,0.35)] sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          {exists ? (
            <Button type="button" variant="ghost" className={builtIn ? "text-ink" : "text-destructive"} onClick={() => setConfirm(true)}>
              {builtIn ? (
                <>
                  <RotateCcw aria-hidden /> Restore Designed Version
                </>
              ) : (
                "Delete Page"
              )}
            </Button>
          ) : (
            <span />
          )}
          <Button type="submit" disabled={saving}>
            {saving && <Spinner />}
            {saving ? "Saving…" : form.status === "published" ? "Save and Publish" : "Save Draft"}
          </Button>
        </div>
      </form>
      <Confirm
        open={confirm}
        onOpenChange={setConfirm}
        title={builtIn ? "Restore the designed version?" : "Delete this page?"}
        description={builtIn ? "Your edited text (and any draft) is deleted and the website shows the designed page again." : "The page disappears from the website. Links to it will show “Page not found”."}
        confirmLabel={builtIn ? "Restore Designed Version" : "Delete Page"}
        pendingLabel={builtIn ? "Restoring…" : "Deleting…"}
        destructive={!builtIn}
        onConfirm={async () => {
          const res = await send(`/admin/pages/${param}`, "DELETE");
          if (!res.ok) return void toast("error", res.message);
          toast("success", builtIn ? "The designed version is back." : "Page deleted.");
          router.replace("/admin/pages");
        }}
      />
    </AdminPage>
  );
}
