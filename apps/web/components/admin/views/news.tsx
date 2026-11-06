"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ExternalLink, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { AdminPage, Badge, Confirm, DataTable, Empty, ErrorNote, Loading, Pager, Panel, fmtDate, label, statusTone, useToast } from "@/components/admin/ui";
import { FormGrid, RichTextArea, Select, TextInput, focusFirstError } from "@/components/admin/form";
import { ImageField, uploadEditorImage } from "@/components/admin/media";
import { slugify } from "@/lib/admin/text";
import { qs, send, useApi, type Paged } from "@/lib/admin/use-api";
import { useUrlState } from "@/lib/admin/url-state";
import { routes } from "@/lib/site";

const CATEGORIES: [string, string][] = ["Announcement", "Conference", "Seminar", "Workshop", "Webinar"].map((c) => [c, c]);

interface NewsRow { id: string; slug: string; title: string; category: string; status: string; publishedAt: string | null }

export function NewsView() {
  const url = useUrlState();
  const list = useApi<Paged<NewsRow>>(`/admin/news${qs({ status: url.get("status"), page: url.page, pageSize: 25 })}`);
  return (
    <AdminPage
      title="News"
      description="Articles shown under News & Insights."
      actions={
        <Button asChild>
          <Link href="/admin/news/new">
            <Plus aria-hidden /> New Article
          </Link>
        </Button>
      }
    >
      <Panel>
        {list.error && <ErrorNote message={list.error.message} onRetry={list.reload} />}
        {list.loading && !list.data && <Loading />}
        {list.data && list.data.items.length === 0 && <Empty title="No articles yet" />}
        {list.data && list.data.items.length > 0 && (
          <>
            <DataTable
              caption="News articles"
              rows={list.data.items}
              rowKey={(r) => r.id}
              onRowHref={(r) => `/admin/news/${r.id}`}
              columns={[
                { key: "title", header: "Title", cell: (r) => r.title },
                { key: "cat", header: "Category", cell: (r) => r.category, hideBelow: "sm" },
                { key: "date", header: "Published", cell: (r) => fmtDate(r.publishedAt), hideBelow: "md" },
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

interface Form { slug: string; title: string; category: string; excerpt: string; body: string; status: string; publishedAt: string; cover: { id: string | null; url: string | null; changed: boolean } }
const EMPTY: Form = { slug: "", title: "", category: "Announcement", excerpt: "", body: "", status: "draft", publishedAt: "", cover: { id: null, url: null, changed: false } };

export function NewsEditor({ id }: { id: string }) {
  const isNew = id === "new";
  const router = useRouter();
  const toast = useToast();
  const loaded = useApi<{ slug: string; title: string; category: string; excerpt: string; body: string; status: string; publishedAt: string | null; coverId: string | null; coverUrl: string | null }>(isNew ? null : `/admin/news/${id}`);
  const [form, setForm] = useState<Form | null>(isNew ? EMPTY : null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, startSaving] = useTransition();
  const [del, setDel] = useState(false);

  useEffect(() => {
    const n = loaded.data;
    if (n && !form) {
      const raf = requestAnimationFrame(() => setForm({ slug: n.slug, title: n.title, category: n.category, excerpt: n.excerpt, body: n.body, status: n.status, publishedAt: n.publishedAt?.slice(0, 10) ?? "", cover: { id: n.coverId, url: n.coverUrl, changed: false } }));
      return () => cancelAnimationFrame(raf);
    }
  }, [loaded.data, form]);

  if (loaded.error) return <AdminPage title="Article"><ErrorNote message={loaded.error.message} onRetry={loaded.reload} /></AdminPage>;
  if (!form) return <AdminPage title="Article"><Loading /></AdminPage>;
  const set = (patch: Partial<Form>) => setForm({ ...form, ...patch });

  function save(e: React.FormEvent) {
    e.preventDefault();
    const f = form!;
    startSaving(async () => {
      const res = await send<{ id: string }>(isNew ? "/admin/news" : `/admin/news/${id}`, isNew ? "POST" : "PUT", {
        slug: f.slug.trim() || slugify(f.title), title: f.title.trim(), category: f.category, excerpt: f.excerpt, body: f.body, status: f.status,
        publishedAt: f.publishedAt ? new Date(`${f.publishedAt}T09:00:00Z`).toISOString() : null,
        ...(f.cover.changed ? { coverId: f.cover.id, ...(f.cover.id === null ? { legacyCoverPath: null } : {}) } : {}),
      });
      if (!res.ok) {
        const fields = res.fields ?? (res.code === "DUPLICATE" ? { slug: res.message } : {});
        setErrors(fields);
        focusFirstError(fields);
        toast("error", res.message);
        return;
      }
      setErrors({});
      toast("success", isNew ? "Article created." : "Changes saved.");
      if (isNew) router.replace(`/admin/news/${res.data.id}`);
    });
  }

  return (
    <AdminPage
      title={isNew ? "New Article" : form.title}
      actions={
        <>
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin/news">
              <ArrowLeft aria-hidden /> All News
            </Link>
          </Button>
          {!isNew && form.status === "published" && (
            <Button asChild variant="outline" size="sm">
              <Link href={routes.newsArticle(form.slug)} target="_blank" rel="noopener">
                View Article <ExternalLink aria-hidden />
              </Link>
            </Button>
          )}
        </>
      }
    >
      <form onSubmit={save} noValidate className="space-y-6">
        <Panel>
          <FormGrid>
            <TextInput id="title" label="Title" value={form.title} onChange={(v) => set({ title: v })} errors={errors} className="sm:col-span-2" />
            <Select id="category" label="Category" value={form.category} onChange={(v) => set({ category: v })} options={CATEGORIES} />
            <TextInput id="slug" label="Web address" value={form.slug} onChange={(v) => set({ slug: v })} errors={errors} placeholder={slugify(form.title) || "e.g. dtisb-2027-call-for-papers…"} hint="Leave empty to create one from the title." />
            <Select id="status" label="Status" value={form.status} onChange={(v) => set({ status: v })} options={[["draft", "Draft (hidden)"], ["published", "Published"], ["archived", "Archived"]]} />
            <TextInput id="publishedAt" label="Publication date" type="date" value={form.publishedAt} onChange={(v) => set({ publishedAt: v })} errors={errors} hint="Empty = today when published." />
            <div className="sm:col-span-2">
              <ImageField label="Cover photo" purpose="cover" url={form.cover.url} name={form.title} onChange={(v) => set({ cover: { ...v, changed: true } })} hint="Shown on the article and in news lists. Without one, an illustration for the category is used." />
            </div>
            <RichTextArea id="excerpt" label="Summary" value={form.excerpt} onChange={(v) => set({ excerpt: v })} errors={errors} rows={3} max={600} hint="One or two sentences shown in news lists." className="sm:col-span-2" />
            <RichTextArea id="body" label="Article" variant="full" value={form.body} onChange={(v) => set({ body: v })} errors={errors} rows={14} onUploadImage={uploadEditorImage} className="sm:col-span-2" />
          </FormGrid>
        </Panel>
        <div className="flex flex-wrap items-center justify-between gap-3">
          {!isNew ? (
            <Button type="button" variant="ghost" className="text-destructive" onClick={() => setDel(true)}>
              Delete Article
            </Button>
          ) : (
            <span />
          )}
          <Button type="submit" disabled={saving}>
            {saving && <Spinner />}
            {saving ? "Saving…" : isNew ? "Create Article" : "Save Changes"}
          </Button>
        </div>
      </form>
      <Confirm
        open={del}
        onOpenChange={setDel}
        title="Delete This Article?"
        description="The article is removed from the website permanently."
        confirmLabel="Delete Permanently"
        pendingLabel="Deleting…"
        destructive
        onConfirm={async () => {
          const res = await send(`/admin/news/${id}`, "DELETE");
          if (!res.ok) {
            toast("error", res.message);
            return true;
          }
          toast("success", "Article deleted.");
          router.replace("/admin/news");
        }}
      />
    </AdminPage>
  );
}
