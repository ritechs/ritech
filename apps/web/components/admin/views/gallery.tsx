"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, ExternalLink, ImagePlus, Images, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { AdminPage, Badge, Confirm, Empty, ErrorNote, Loading, Panel, fmtDate, label, statusTone, useToast } from "@/components/admin/ui";
import { FormGrid, Select, TextArea, TextInput, focusFirstError } from "@/components/admin/form";
import { uploadMedia } from "@/components/admin/media";
import { LegacyImage } from "@/components/media/legacy-image";
import { slugify } from "@/lib/admin/text";
import { send, useApi } from "@/lib/admin/use-api";

interface Album { id: string; slug: string; title: string; takenOn: string | null; status: string; photos: number; coverUrl: string | null }

export function GalleryView() {
  const list = useApi<Album[]>("/admin/gallery");
  return (
    <AdminPage
      title="Gallery"
      description="Photo albums from conferences and events, shown on the Gallery page."
      actions={
        <Button asChild>
          <Link href="/admin/gallery/new">
            <Plus aria-hidden /> New Album
          </Link>
        </Button>
      }
    >
      {list.error && <ErrorNote message={list.error.message} onRetry={list.reload} />}
      {!list.data && !list.error && <Loading />}
      {list.data && list.data.length === 0 && (
        <Panel>
          <Empty title="No albums yet" text="Create an album and upload photos from a conference or event." />
        </Panel>
      )}
      {list.data && list.data.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.data.map((a) => (
            <li key={a.id}>
              <Link href={`/admin/gallery/${a.id}`} className="group block overflow-hidden rounded-lg border border-rule bg-surface transition-[border-color,box-shadow] hover:border-rule-strong hover:shadow-[0_12px_28px_-20px_rgba(32,33,36,0.35)]">
                <span className="relative block aspect-[16/10] bg-brand-wash">
                  <LegacyImage path={a.coverUrl ?? undefined} alt="" sizes="(min-width: 1280px) 22rem, (min-width: 640px) 45vw, 100vw" fallback={<span className="absolute inset-0 flex items-center justify-center text-brand/60"><Images className="size-8" aria-hidden /></span>} />
                </span>
                <span className="flex items-start justify-between gap-3 p-4">
                  <span className="min-w-0">
                    <span className="block truncate font-serif text-lg text-ink group-hover:text-brand">{a.title}</span>
                    <span className="block text-sm text-muted-ink">
                      {a.photos} {a.photos === 1 ? "photo" : "photos"}
                      {a.takenOn ? ` · ${fmtDate(a.takenOn)}` : ""}
                    </span>
                  </span>
                  <Badge tone={statusTone(a.status)}>{label(a.status)}</Badge>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AdminPage>
  );
}

/* --------------------------------- editor --------------------------------- */

interface Photo { key: string; mediaId: string | null; legacyPath: string | null; url: string; caption: string }
interface Form { slug: string; title: string; description: string; takenOn: string; status: string; photos: Photo[] }
const EMPTY: Form = { slug: "", title: "", description: "", takenOn: "", status: "draft", photos: [] };

export function AlbumEditor({ id }: { id: string }) {
  const isNew = id === "new";
  const router = useRouter();
  const toast = useToast();
  const loaded = useApi<{ slug: string; title: string; description: string | null; takenOn: string | null; status: string; items: { id: string; mediaId: string | null; legacyPath: string | null; url: string; caption: string | null }[] }>(isNew ? null : `/admin/gallery/${id}`);
  const [form, setForm] = useState<Form | null>(isNew ? EMPTY : null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, startSaving] = useTransition();
  const [uploading, setUploading] = useState<{ done: number; total: number } | null>(null);
  const [del, setDel] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const a = loaded.data;
    if (a && !form) {
      const raf = requestAnimationFrame(() =>
        setForm({
          slug: a.slug, title: a.title, description: a.description ?? "", takenOn: a.takenOn ?? "", status: a.status,
          photos: a.items.map((i) => ({ key: i.id, mediaId: i.mediaId, legacyPath: i.legacyPath, url: i.url, caption: i.caption ?? "" })),
        }),
      );
      return () => cancelAnimationFrame(raf);
    }
  }, [loaded.data, form]);

  if (loaded.error) return <AdminPage title="Album"><ErrorNote message={loaded.error.message} onRetry={loaded.reload} /></AdminPage>;
  if (!form) return <AdminPage title="Album"><Loading /></AdminPage>;
  const set = (patch: Partial<Form>) => setForm((f) => (f ? { ...f, ...patch } : f));
  const setPhotos = (fn: (p: Photo[]) => Photo[]) => setForm((f) => (f ? { ...f, photos: fn(f.photos) } : f));

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    const list = [...files];
    setUploading({ done: 0, total: list.length });
    let failed = 0;
    for (const [i, file] of list.entries()) {
      const res = await uploadMedia(file, "gallery", form!.title || undefined);
      if (res.ok) setPhotos((p) => [...p, { key: res.data.id, mediaId: res.data.id, legacyPath: null, url: res.data.url, caption: "" }]);
      else failed++;
      setUploading({ done: i + 1, total: list.length });
    }
    setUploading(null);
    if (input.current) input.current.value = "";
    if (failed) toast("error", `${failed} photo${failed === 1 ? "" : "s"} could not be uploaded. Use JPG, PNG or WebP under 5 MB.`);
    else toast("success", `${list.length} photo${list.length === 1 ? "" : "s"} added. Save the album to keep them.`);
  }

  const move = (i: number, by: -1 | 1) =>
    setPhotos((p) => {
      const next = [...p];
      const j = i + by;
      if (j < 0 || j >= next.length) return p;
      [next[i], next[j]] = [next[j]!, next[i]!];
      return next;
    });

  function save(e: React.FormEvent) {
    e.preventDefault();
    const f = form!;
    if (!f.title.trim()) {
      setErrors({ title: "Enter the album title." });
      focusFirstError({ title: "x" });
      return;
    }
    startSaving(async () => {
      const res = await send<{ id: string }>(isNew ? "/admin/gallery" : `/admin/gallery/${id}`, isNew ? "POST" : "PUT", {
        slug: f.slug.trim() || slugify(f.title),
        title: f.title.trim(),
        description: f.description.trim() || null,
        takenOn: f.takenOn || null,
        status: f.status,
        items: f.photos.map((p) => ({ mediaId: p.mediaId, legacyPath: p.legacyPath, caption: p.caption.trim() || null })),
      });
      if (!res.ok) {
        const fields = res.fields ?? (res.code === "DUPLICATE" ? { slug: "Another album already uses this web address." } : {});
        setErrors(fields);
        focusFirstError(fields);
        if (!Object.keys(fields).length) toast("error", res.message);
        return;
      }
      setErrors({});
      toast("success", isNew ? "Album created." : "Album saved.");
      if (isNew) router.replace(`/admin/gallery/${res.data.id}`);
    });
  }

  return (
    <AdminPage
      title={isNew ? "New Album" : form.title}
      actions={
        <>
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin/gallery">
              <ArrowLeft aria-hidden /> All Albums
            </Link>
          </Button>
          {!isNew && form.status === "published" && (
            <Button asChild variant="outline" size="sm">
              <Link href="/gallery" target="_blank" rel="noopener">
                View Gallery <ExternalLink aria-hidden />
              </Link>
            </Button>
          )}
        </>
      }
    >
      <form onSubmit={save} noValidate className="space-y-6">
        <Panel title="Album">
          <FormGrid>
            <TextInput id="title" label="Title" value={form.title} onChange={(v) => set({ title: v })} errors={errors} placeholder="e.g. ICETCS 2026, Genoa…" />
            <TextInput id="takenOn" label="Date (optional)" type="date" value={form.takenOn} onChange={(v) => set({ takenOn: v })} errors={errors} />
            <Select id="status" label="Status" value={form.status} onChange={(v) => set({ status: v })} options={[["draft", "Draft (hidden)"], ["published", "Published"], ["archived", "Archived"]]} errors={errors} />
            <TextInput id="slug" label="Web address" value={form.slug} onChange={(v) => set({ slug: v })} errors={errors} placeholder="Made from the title if left empty…" />
          </FormGrid>
          <div className="mt-4">
            <TextArea id="description" label="Description (optional)" value={form.description} onChange={(v) => set({ description: v })} errors={errors} rows={2} />
          </div>
        </Panel>

        <Panel
          title={`Photos (${form.photos.length})`}
          actions={
            <>
              <input ref={input} id="photos" type="file" multiple accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label="Upload photos" onChange={(e) => void upload(e.target.files)} />
              <Button type="button" size="sm" variant="outline" disabled={!!uploading} onClick={() => input.current?.click()}>
                {uploading ? <Spinner /> : <ImagePlus aria-hidden />}
                {uploading ? `Uploading ${uploading.done + 1} of ${uploading.total}…` : "Upload Photos"}
              </Button>
            </>
          }
        >
          {form.photos.length === 0 ? (
            <button type="button" onClick={() => input.current?.click()} className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-rule-strong bg-paper px-6 py-12 text-center text-sm text-muted-ink hover:border-brand/40">
              <ImagePlus className="size-6 text-brand" aria-hidden />
              Choose photos to upload. You can select several at once.
            </button>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {form.photos.map((p, i) => (
                <li key={p.key} className="overflow-hidden rounded-lg border border-rule bg-surface">
                  <span className="relative block aspect-[4/3] bg-brand-wash">
                    <LegacyImage path={p.url} alt={p.caption || `Photo ${i + 1}`} sizes="(min-width: 1024px) 14rem, 45vw" fallback={<span className="absolute inset-0 flex items-center justify-center text-xs text-brand/70">Photo {i + 1}</span>} />
                    {i === 0 && <span className="absolute top-2 left-2 rounded-sm bg-brand px-1.5 py-0.5 text-[0.6875rem] font-medium text-white">Cover</span>}
                  </span>
                  <div className="space-y-2 p-2.5">
                    <label htmlFor={`cap-${p.key}`} className="sr-only">
                      Caption for photo {i + 1}
                    </label>
                    <Input id={`cap-${p.key}`} value={p.caption} placeholder="Caption…" className="h-10 text-sm" onChange={(e) => setPhotos((ps) => ps.map((x) => (x.key === p.key ? { ...x, caption: e.target.value } : x)))} />
                    <div className="flex items-center justify-between">
                      <span className="flex">
                        <Button type="button" variant="ghost" size="icon" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move photo ${i + 1} earlier`}>
                          <ArrowLeft aria-hidden />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" disabled={i === form.photos.length - 1} onClick={() => move(i, 1)} aria-label={`Move photo ${i + 1} later`}>
                          <ArrowRight aria-hidden />
                        </Button>
                      </span>
                      <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => setPhotos((ps) => ps.filter((x) => x.key !== p.key))} aria-label={`Remove photo ${i + 1}`}>
                        <Trash2 aria-hidden />
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-xs text-faint-ink">The first photo is the album cover. Photos are resized and stripped of location data when uploaded.</p>
        </Panel>

        <div className="sticky bottom-0 z-20 -mx-4 flex flex-wrap items-center justify-between gap-3 border-t border-rule bg-surface px-4 py-3 shadow-[0_-12px_24px_-20px_rgba(32,33,36,0.35)] sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          {!isNew ? (
            <Button type="button" variant="ghost" className="text-destructive" onClick={() => setDel(true)}>
              Delete Album
            </Button>
          ) : (
            <span />
          )}
          <Button type="submit" disabled={saving || !!uploading}>
            {saving && <Spinner />}
            {saving ? "Saving…" : isNew ? "Create Album" : "Save Changes"}
          </Button>
        </div>
      </form>
      <Confirm
        open={del}
        onOpenChange={setDel}
        title="Delete this album?"
        description="The album and its photo list are removed from the website. This cannot be undone."
        confirmLabel="Delete Album"
        pendingLabel="Deleting…"
        destructive
        onConfirm={async () => {
          const res = await send(`/admin/gallery/${id}`, "DELETE");
          if (!res.ok) return void toast("error", res.message);
          toast("success", "Album deleted.");
          router.replace("/admin/gallery");
        }}
      />
    </AdminPage>
  );
}
