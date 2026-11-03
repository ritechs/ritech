"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, ExternalLink, Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Thumb } from "@/components/admin/media";
import { apiRaw } from "@/lib/api/client";

/** A chosen record shown in a picker: enough to display it without another request. */
export interface Picked {
  id: string;
  name: string;
  sub?: string | null;
  image?: string | null;
  /** Free label per item, e.g. a speaker's role ("keynote") or a sponsor's tier ("Gold"). */
  tag?: string | null;
}

interface Source {
  /** Admin list endpoint with ?q= search, e.g. "/admin/speakers". */
  endpoint: string;
  /** Turns a list row into a Picked item. */
  map: (row: Record<string, unknown>) => Picked;
}

/** Sources for the pickers used on conferences and events. */
export const SPEAKERS: Source = {
  endpoint: "/admin/speakers",
  map: (r) => ({ id: String(r.id), name: String(r.name), sub: [r.designation, r.organisation].filter(Boolean).join(", ") || null, image: (r.photoUrl as string | null) ?? null }),
};
export const ORGANISATIONS: Source = {
  endpoint: "/admin/organisations",
  map: (r) => ({ id: String(r.id), name: String(r.name), sub: (r.acronym as string | null) ?? null, image: (r.logoUrl as string | null) ?? null }),
};

/**
 * Choose and order several records (speakers, sponsors). Search adds to the
 * list; each chosen item can be moved, given a tag, or removed.
 */
export function EntityPicker({
  label,
  source,
  value,
  onChange,
  tagLabel,
  tagOptions,
  tagPlaceholder,
  fit = "cover",
  manageHref,
  noun,
}: {
  label: string;
  source: Source;
  value: Picked[];
  onChange: (v: Picked[]) => void;
  tagLabel?: string;
  /** Fixed choices for the tag (a select); without them the tag is free text. */
  tagOptions?: [string, string][];
  tagPlaceholder?: string;
  fit?: "cover" | "contain";
  /** Where to add new records that are not in the list yet. */
  manageHref: string;
  noun: string;
}) {
  const id = useId();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Picked[] | null>(null);
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const chosen = new Set(value.map((v) => v.id));

  useEffect(() => {
    clearTimeout(timer.current);
    if (!q.trim()) {
      timer.current = setTimeout(() => setResults(null), 0);
      return;
    }
    timer.current = setTimeout(async () => {
      setBusy(true);
      const res = await apiRaw<{ items: Record<string, unknown>[] }>(`${source.endpoint}?q=${encodeURIComponent(q.trim())}&pageSize=8`);
      setBusy(false);
      setResults(res.ok ? res.data.items.map(source.map) : []);
    }, 250);
    return () => clearTimeout(timer.current);
  }, [q, source]);

  const move = (i: number, by: -1 | 1) => {
    const next = [...value];
    const j = i + by;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j]!, next[i]!];
    onChange(next);
  };

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-medium text-ink">
          {label} <span className="font-normal text-faint-ink numerals-tabular">({value.length})</span>
        </h3>
        <Link href={manageHref} target="_blank" className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline">
          Add a new {noun} <ExternalLink className="size-3" aria-hidden />
        </Link>
      </div>

      <div className="relative mt-2">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint-ink" aria-hidden />
        <label htmlFor={`${id}-q`} className="sr-only">
          Search {noun}s to add
        </label>
        <Input id={`${id}-q`} type="search" autoComplete="off" value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${noun}s to add, e.g. a name…`} className="pl-9" />
        {busy && <Spinner className="absolute top-1/2 right-3 -translate-y-1/2" />}
      </div>
      {results && (
        <ul className="mt-1 max-h-64 overflow-y-auto rounded-md border border-rule bg-surface shadow-[0_12px_28px_-20px_rgba(32,33,36,0.4)]" aria-label={`Matching ${noun}s`}>
          {results.length === 0 && <li className="px-3 py-3 text-sm text-muted-ink">No {noun}s match “{q}”.</li>}
          {results.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                disabled={chosen.has(r.id)}
                onClick={() => {
                  onChange([...value, r]);
                  setQ("");
                }}
                className="flex min-h-12 w-full items-center gap-3 px-3 py-2 text-left hover:bg-paper disabled:opacity-50"
              >
                <Thumb src={r.image} name={r.name} fit={fit} className="size-8" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-ink">{r.name}</span>
                  {r.sub && <span className="block truncate text-xs text-muted-ink">{r.sub}</span>}
                </span>
                {chosen.has(r.id) ? <span className="text-xs text-faint-ink">Added</span> : <Plus className="size-4 text-brand" aria-hidden />}
              </button>
            </li>
          ))}
        </ul>
      )}

      {value.length === 0 ? (
        <p className="mt-3 text-sm text-muted-ink">None chosen yet.</p>
      ) : (
        <ol className="mt-3 divide-y divide-rule rounded-lg border border-rule">
          {value.map((v, i) => (
            <li key={v.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2">
              <Thumb src={v.image} name={v.name} fit={fit} className="size-9" />
              <span className="min-w-0 flex-1 basis-40">
                <span className="block truncate text-sm font-medium text-ink">{v.name}</span>
                {v.sub && <span className="block truncate text-xs text-muted-ink">{v.sub}</span>}
              </span>
              {tagLabel &&
                (tagOptions ? (
                  <select
                    aria-label={`${tagLabel} for ${v.name}`}
                    value={v.tag ?? ""}
                    onChange={(e) => onChange(value.map((x) => (x.id === v.id ? { ...x, tag: e.target.value || null } : x)))}
                    className="h-10 rounded-md border border-rule bg-surface px-2 text-sm text-ink"
                  >
                    {tagOptions.map(([val, lab]) => (
                      <option key={val} value={val}>
                        {lab}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    aria-label={`${tagLabel} for ${v.name}`}
                    value={v.tag ?? ""}
                    placeholder={tagPlaceholder}
                    onChange={(e) => onChange(value.map((x) => (x.id === v.id ? { ...x, tag: e.target.value } : x)))}
                    className="h-10 w-32 text-sm"
                  />
                ))}
              <span className="flex">
                <Button type="button" variant="ghost" size="icon" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move ${v.name} up`}>
                  <ArrowUp aria-hidden />
                </Button>
                <Button type="button" variant="ghost" size="icon" disabled={i === value.length - 1} onClick={() => move(i, 1)} aria-label={`Move ${v.name} down`}>
                  <ArrowDown aria-hidden />
                </Button>
                <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => onChange(value.filter((x) => x.id !== v.id))} aria-label={`Remove ${v.name}`}>
                  <X aria-hidden />
                </Button>
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/** Upload a PDF; shows the current file with a link. */
export function PdfField({ label, url, onChange, hint }: { label: string; url: string | null; onChange: (v: { id: string | null; url: string | null }) => void; hint?: string }) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  async function pick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(undefined);
    const form = new FormData();
    form.set("file", file);
    form.set("purpose", "document");
    const res = await apiRaw<{ id: string; url: string }>("/admin/media", { form });
    setBusy(false);
    if (input.current) input.current.value = "";
    if (!res.ok) return setError(res.message);
    onChange({ id: res.data.id, url: res.data.url });
  }
  return (
    <div>
      <p id={`${id}-l`} className="text-sm font-medium text-ink">
        {label}
      </p>
      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        <input ref={input} type="file" accept="application/pdf" className="sr-only" aria-labelledby={`${id}-l`} onChange={(e) => void pick(e.target.files?.[0])} />
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => input.current?.click()}>
          {busy ? <Spinner /> : <Plus aria-hidden />}
          {busy ? "Uploading…" : url ? "Replace PDF" : "Upload PDF"}
        </Button>
        {url && (
          <>
            <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-brand hover:underline">
              Current file
            </a>
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange({ id: null, url: null })}>
              <X aria-hidden /> Remove
            </Button>
          </>
        )}
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
