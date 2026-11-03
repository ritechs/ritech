"use client";

import { Spinner } from "@/components/ui/spinner";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertCircle, Search } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AreaBadge, AuthorLine, DemoBadge, PublicationDate } from "@/components/publications/parts";
import { searchPublications } from "@/lib/api/publication-search";
import { routes } from "@/lib/site";
import type { PublicationSearchResult } from "@/lib/types";

type Status = { kind: "idle" } | { kind: "loading" } | { kind: "error" } | { kind: "done"; query: string; result: PublicationSearchResult };

const SUGGESTIONS = ["machine learning", "cybersecurity", "forecasting", "microgrids", "open source"];

/** Site search: searches publications as you type (debounced), with loading, empty and error states. */
export function SearchDialog({ trigger }: { trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const abortRef = useRef<AbortController | null>(null);

  // "/" or Ctrl/Cmd+K opens search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing = target.closest("input, textarea, select, [contenteditable=true]");
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function run(q: string) {
    abortRef.current?.abort();
    if (!q.trim()) {
      setStatus({ kind: "idle" });
      return;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus({ kind: "loading" });
    try {
      const result = await searchPublications({ query: q }, controller.signal);
      setStatus({ kind: "done", query: q.trim(), result });
    } catch (err) {
      if ((err as Error).name !== "AbortError") setStatus({ kind: "error" });
    }
  }

  useEffect(() => {
    const t = setTimeout(() => void run(query), 250);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          abortRef.current?.abort();
          setQuery("");
          setStatus({ kind: "idle" });
        }
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent closeLabel="Close search" className="sm:top-[10vh]">
        <DialogTitle className="sr-only">Search RiTECHS</DialogTitle>
        <DialogDescription className="sr-only">Search publications by title, author or keyword.</DialogDescription>
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            void run(query);
          }}
          className="flex items-center gap-3 border-b border-rule px-5 pr-16 focus-within:bg-brand-wash/40"
        >
          <Search className="size-5 shrink-0 text-faint-ink" aria-hidden />
          <label htmlFor="site-search" className="sr-only">
            Search publications
          </label>
          <input
            id="site-search"
            type="search"
            autoFocus
            autoComplete="off"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title, author or keyword…"
            className="h-16 w-full bg-transparent text-[1.0625rem] text-ink outline-none placeholder:text-faint-ink [&::-webkit-search-cancel-button]:appearance-none"
          />
          {status.kind === "loading" && (
            <>
              <Spinner className="text-faint-ink" />
              <span className="sr-only">Searching…</span>
            </>
          )}
        </form>

        <div className="min-h-40 overflow-y-auto px-2 py-3" aria-live="polite" aria-busy={status.kind === "loading"}>
          {status.kind === "idle" && (
            <div className="px-3 py-2">
              <p className="text-sm text-muted-ink">Try searching for</p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <li key={s}>
                    <button
                      type="button"
                      onClick={() => setQuery(s)}
                      className="inline-flex h-11 items-center rounded-full border border-rule px-3.5 text-sm text-ink hover:border-brand/50 hover:text-brand"
                    >
                      {s}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {status.kind === "error" && (
            <p role="alert" className="flex items-start gap-2.5 px-3 py-2 text-sm text-ink">
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
              Search isn&apos;t available right now. Check your connection and try again.
            </p>
          )}

          {status.kind === "done" && status.result.total === 0 && (
            <div className="px-3 py-2">
              <p className="font-serif text-lg text-ink">No publications match &ldquo;{status.query}&rdquo;.</p>
              <p className="mt-1 text-sm text-muted-ink">Try fewer words, or search by an author&apos;s surname.</p>
            </div>
          )}

          {status.kind === "done" && status.result.total > 0 && (
            <>
              <p className="px-3 pb-2 text-sm text-muted-ink">
                {status.result.total} {status.result.total === 1 ? "publication" : "publications"}
              </p>
              <ul>
                {status.result.items.slice(0, 8).map((p) => (
                  <li key={p.id}>
                    <Link
                      href={routes.publication(p.slug)}
                      onClick={() => setOpen(false)}
                      className="block rounded-md px-3 py-3 hover:bg-brand-wash focus-visible:bg-brand-wash"
                    >
                      <span className="flex flex-wrap items-center gap-2">
                        <AreaBadge publication={p} className="py-0.5" />
                        <DemoBadge show={p.source === "demo"} />
                        <PublicationDate publication={p} className="text-xs text-faint-ink" />
                      </span>
                      <span className="mt-1.5 block font-serif text-[1.0625rem] leading-snug text-ink">{p.title}</span>
                      <AuthorLine publication={p} className="mt-1 text-[0.8125rem] text-muted-ink" />
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
        <div className="hidden border-t border-rule bg-paper px-5 py-2.5 text-xs text-faint-ink sm:block">
          Press <kbd className="rounded border border-rule-strong bg-surface px-1.5 font-sans">/</kbd> anywhere to search.
        </div>
      </DialogContent>
    </Dialog>
  );
}
