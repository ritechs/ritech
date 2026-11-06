"use client";

import { useId, useRef, useState } from "react";
import { ImagePlus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { LegacyImage } from "@/components/media/legacy-image";
import { apiRaw } from "@/lib/api/client";
import { cn, initials } from "@/lib/utils";

export type MediaPurpose = "cover" | "logo" | "gallery" | "content" | "document" | "avatar";
export interface Uploaded {
  id: string;
  url: string;
}

/** Uploads one file to the media library (images are re-encoded to WebP by the API). */
export async function uploadMedia(file: File, purpose: MediaPurpose, alt?: string) {
  const form = new FormData();
  form.set("file", file);
  form.set("purpose", purpose);
  if (alt) form.set("alt", alt);
  return apiRaw<Uploaded>("/admin/media", { form });
}

/** A small square image (photo or logo) with initials when there is none or it fails to load. */
export function Thumb({ src, name, fit = "cover", className }: { src?: string | null; name: string; fit?: "cover" | "contain"; className?: string }) {
  return (
    <span className={cn("relative inline-flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-rule bg-brand-wash text-xs font-medium text-brand", className)}>
      <LegacyImage path={src ?? undefined} alt="" sizes="48px" fit={fit} className={fit === "contain" ? "bg-white p-0.5" : undefined} fallback={<span aria-hidden>{initials(name)}</span>} />
    </span>
  );
}

/** Image picker for forms: shows the current image, uploads a new one, or removes it. */
export function ImageField({
  label,
  purpose,
  url,
  onChange,
  hint,
  fit = "cover",
  name = "",
}: {
  label: string;
  purpose: MediaPurpose;
  url: string | null;
  onChange: (v: { id: string | null; url: string | null }) => void;
  hint?: string;
  fit?: "cover" | "contain";
  name?: string;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function pick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(undefined);
    const res = await uploadMedia(file, purpose, name || undefined);
    setBusy(false);
    if (input.current) input.current.value = "";
    if (!res.ok) return setError(res.message);
    onChange({ id: res.data.id, url: res.data.url });
  }

  return (
    <div>
      <p id={`${id}-label`} className="text-sm font-medium text-ink">
        {label}
      </p>
      <div className="mt-1.5 flex items-center gap-4">
        <Thumb src={url} name={name || label} fit={fit} className="size-20 text-base" />
        <div className="flex flex-wrap gap-2">
          <input ref={input} id={id} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" aria-labelledby={`${id}-label`} onChange={(e) => void pick(e.target.files?.[0])} />
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => input.current?.click()}>
            {busy ? <Spinner /> : <ImagePlus aria-hidden />}
            {busy ? "Uploading…" : url ? "Replace" : "Upload"}
          </Button>
          {url && !busy && (
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange({ id: null, url: null })}>
              <Trash2 aria-hidden /> Remove
            </Button>
          )}
        </div>
      </div>
      {hint && !error && <p className="mt-1.5 text-xs text-faint-ink">{hint}</p>}
      {error && (
        <p role="alert" className="mt-1.5 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

/** Search box for list pages; updates as you type (the caller debounces through the URL). */
export function SearchBox({ value, onChange, placeholder, label }: { value: string; onChange: (v: string) => void; placeholder: string; label: string }) {
  const [text, setText] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  return (
    <div className="relative w-full sm:max-w-xs">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint-ink" aria-hidden />
      <Input
        type="search"
        aria-label={label}
        placeholder={placeholder}
        value={text}
        autoComplete="off"
        className="pl-9"
        onChange={(e) => {
          const v = e.target.value;
          setText(v);
          clearTimeout(timer.current);
          timer.current = setTimeout(() => onChange(v.trim()), 300);
        }}
      />
    </div>
  );
}

/** Image button of the rich text editor: uploads to the media library and returns the image address. */
export async function uploadEditorImage(file: File): Promise<string> {
  const res = await uploadMedia(file, "content");
  if (!res.ok) throw new Error(res.message || "The image could not be uploaded.");
  return res.data.url;
}
