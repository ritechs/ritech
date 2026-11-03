"use client";

import { useRef, useState } from "react";
import { ExternalLink, FileText, Image as ImageIcon, Link2, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { AdminPage, Confirm, Empty, ErrorNote, Loading, Panel, Tabs, fmtDate, useToast } from "@/components/admin/ui";
import { TextInput, focusFirstError } from "@/components/admin/form";
import { apiRaw } from "@/lib/api/client";
import { send, useApi } from "@/lib/admin/use-api";

interface Resource {
  id: string;
  title: string;
  kind: "file" | "link";
  href: string | null;
  mime: string | null;
  size: number | null;
  createdAt: string;
}

const MAX_BYTES = 10 * 1024 * 1024;

export function ResourcesView() {
  const toast = useToast();
  const list = useApi<Resource[]>("/me/workspace/resources");
  const [mode, setMode] = useState<"file" | "link">("file");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState<Resource | null>(null);
  const input = useRef<HTMLInputElement>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!title.trim()) errs["res-title"] = "Give the resource a title, like “Thesis writing checklist”.";
    if (mode === "link" && !/^https?:\/\/\S+\.\S+/.test(url.trim())) errs["res-url"] = "Enter a full web address starting with https://.";
    if (mode === "file" && !file) errs["res-file"] = "Choose a PDF or image to upload.";
    if (file && file.size > MAX_BYTES) errs["res-file"] = "Files can be at most 10 MB.";
    setErrors(errs);
    if (Object.keys(errs).length) return focusFirstError(errs);
    setBusy(true);
    let res;
    if (mode === "link") res = await send("/me/workspace/resources/link", "POST", { title, url: url.trim() });
    else {
      const form = new FormData();
      form.set("title", title);
      form.set("file", file!);
      res = await apiRaw("/me/workspace/resources/file", { form });
    }
    setBusy(false);
    if (!res.ok) return toast("error", res.message);
    toast("success", "Resource added.");
    setTitle("");
    setUrl("");
    setFile(null);
    void list.reload();
  }

  return (
    <AdminPage title="Resources" description="Share slides, guides, templates or useful links with mentees. Everything here appears on your public profile.">
      <Panel title="Add a Resource">
        <Tabs
          label="Resource type"
          tabs={[
            ["file", "Upload a File"],
            ["link", "Add a Link"],
          ]}
          value={mode}
          onChange={(v) => {
            setMode(v as "file" | "link");
            setErrors({});
          }}
        />
        <form noValidate onSubmit={add} className="mt-5 grid gap-4 sm:grid-cols-2">
          <TextInput id="res-title" label="Title" value={title} onChange={setTitle} errors={errors} placeholder="Thesis writing checklist…" />
          {mode === "link" ? (
            <TextInput id="res-url" label="Web address" value={url} onChange={setUrl} errors={errors} type="url" inputMode="url" spellCheck={false} placeholder="https://example.org/guide…" />
          ) : (
            <div>
              <p className="text-sm font-medium text-ink">File</p>
              <input
                ref={input}
                id="f-res-file"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
                className="sr-only"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                aria-describedby={errors["res-file"] ? "f-res-file-error" : undefined}
              />
              <div className="mt-1.5 flex min-w-0 items-center gap-3">
                <Button type="button" variant="outline" onClick={() => input.current?.click()}>
                  <Upload aria-hidden /> Choose File
                </Button>
                <span className="min-w-0 truncate text-sm text-muted-ink">{file ? file.name : "PDF or image, up to 10 MB"}</span>
              </div>
              {errors["res-file"] && (
                <p id="f-res-file-error" className="mt-1.5 text-sm text-destructive">
                  {errors["res-file"]}
                </p>
              )}
            </div>
          )}
          <div className="sm:col-span-2">
            <Button type="submit" disabled={busy}>
              {busy && <Spinner />}
              {busy ? (mode === "file" ? "Uploading…" : "Adding…") : "Add Resource"}
            </Button>
          </div>
        </form>
      </Panel>

      <Panel title="My Resources">
        {list.error && <ErrorNote message={list.error.message} onRetry={list.reload} />}
        {!list.data && !list.error && <Loading />}
        {list.data && list.data.length === 0 && <Empty title="Nothing shared yet" text="Upload a PDF or add a link above." />}
        {list.data && list.data.length > 0 && (
          <ul className="-my-2 divide-y divide-rule">
            {list.data.map((r) => {
              const Icon = r.kind === "link" ? Link2 : r.mime === "application/pdf" ? FileText : ImageIcon;
              return (
                <li key={r.id} className="flex items-center gap-3 py-3">
                  <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-md bg-brand-wash text-brand">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-ink">{r.title}</p>
                    <p className="text-xs text-faint-ink">
                      {r.kind === "link" ? "Link" : r.mime === "application/pdf" ? "PDF" : "Image"}
                      {r.size ? ` · ${(r.size / 1024 / 1024).toFixed(1)} MB` : ""} · Added {fmtDate(r.createdAt)}
                    </p>
                  </div>
                  {r.href && (
                    <Button asChild variant="ghost" size="icon" aria-label={`Open ${r.title}`}>
                      <a href={r.href} target="_blank" rel="noopener noreferrer">
                        <ExternalLink aria-hidden />
                      </a>
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="text-destructive" aria-label={`Delete ${r.title}`} onClick={() => setDel(r)}>
                    <Trash2 aria-hidden />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <Confirm
        open={!!del}
        onOpenChange={(v) => !v && setDel(null)}
        title="Delete this resource?"
        description={`“${del?.title ?? ""}” is removed from your profile${del?.kind === "file" ? " and the file is deleted" : ""}.`}
        confirmLabel="Delete Resource"
        pendingLabel="Deleting…"
        destructive
        onConfirm={async () => {
          const res = await send(`/me/workspace/resources/${del!.id}`, "DELETE");
          toast(res.ok ? "success" : "error", res.ok ? "Resource deleted." : res.message);
          if (res.ok) void list.reload();
        }}
      />
    </AdminPage>
  );
}
