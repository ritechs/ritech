"use client";

import { createContext, useCallback, useContext, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, CircleAlert, CircleCheck, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

/* ------------------------------- page layout ------------------------------ */

export function AdminPage({ title, description, actions, children }: { title: string; description?: string; actions?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-serif text-3xl text-ink [text-wrap:balance]">{title}</h1>
          {description && <p className="mt-1 max-w-[65ch] text-[0.9375rem] text-muted-ink">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      <div className="mt-6 space-y-6">{children}</div>
    </div>
  );
}

export function Panel({ title, actions, children, className }: { title?: string; actions?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("min-w-0 rounded-lg border border-rule bg-surface", className)}>
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule px-5 py-3.5">
          {title && <h2 className="font-serif text-xl text-ink">{title}</h2>}
          {actions}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

/* --------------------------------- status -------------------------------- */

export type Tone = "neutral" | "success" | "warning" | "danger" | "brand";
const TONES: Record<Tone, string> = {
  neutral: "bg-paper text-muted-ink border-rule",
  success: "bg-success-wash text-success border-success/20",
  warning: "bg-warning-wash text-warning border-warning/20",
  danger: "bg-destructive-wash text-destructive border-destructive/20",
  brand: "bg-brand-wash text-brand border-brand-tint",
};
export function Badge({ tone = "neutral", children }: { tone?: Tone; children: React.ReactNode }) {
  return <span className={cn("inline-flex items-center rounded-sm border px-2 py-0.5 text-xs font-medium whitespace-nowrap", TONES[tone])}>{children}</span>;
}

const STATUS_TONES: Record<string, Tone> = {
  approved: "success",
  published: "success",
  confirmed: "success",
  sent: "success",
  accepted: "success",
  active: "success",
  pending: "warning",
  draft: "warning",
  waitlisted: "warning",
  queued: "warning",
  sending: "warning",
  quoted: "warning",
  new: "brand",
  rejected: "danger",
  suspended: "danger",
  cancelled: "danger",
  declined: "danger",
  failed: "danger",
  block: "danger",
  allow: "success",
};
export const statusTone = (s: string | null | undefined): Tone => STATUS_TONES[s ?? ""] ?? "neutral";

export const label = (s: string) => s.replace(/[-_]/g, " ").replace(/^\w/, (c) => c.toUpperCase());

/* ------------------------------ load states ------------------------------ */

export function Loading({ label: text = "Loading…" }: { label?: string }) {
  return (
    <p className="flex items-center gap-2 py-8 text-sm text-muted-ink" role="status">
      <Spinner /> {text}
    </p>
  );
}

export function ErrorNote({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-wrap items-center gap-3 rounded-md border border-destructive/25 bg-destructive-wash px-4 py-3 text-sm text-destructive">
      <CircleAlert className="size-4" aria-hidden />
      <span className="flex-1">{message}</span>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try Again
        </Button>
      )}
    </div>
  );
}

export function Empty({ title, text, action }: { title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-md border border-dashed border-rule-strong px-6 py-10 text-center">
      <Inbox className="size-6 text-faint-ink" aria-hidden />
      <p className="mt-3 font-medium text-ink">{title}</p>
      {text && <p className="mt-1 max-w-[50ch] text-sm text-muted-ink">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* --------------------------------- tables -------------------------------- */

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
  /** Hide below this breakpoint to keep tables readable on phones. */
  hideBelow?: "sm" | "md" | "lg";
}

const HIDE = {
  sm: "hidden sm:table-cell",
  md: "hidden md:table-cell",
  lg: "hidden lg:table-cell",
};

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  caption,
  onRowHref,
  linkKey,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (r: T) => string;
  caption: string;
  onRowHref?: (r: T) => string;
  /** Column that links to the row (default: the first). */ linkKey?: string;
}) {
  const linkCol = linkKey ?? columns[0]?.key;
  return (
    <div className="-mx-5 overflow-x-auto">
      <table className="w-full min-w-[36rem] text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="border-y border-rule bg-paper text-xs text-muted-ink">
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col" className={cn("px-5 py-2.5 font-medium", c.hideBelow && HIDE[c.hideBelow], c.className)}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-rule">
          {rows.map((r) => (
            <tr key={rowKey(r)} className={cn("align-top", onRowHref && "hover:bg-paper/60")}>
              {columns.map((c) => (
                <td key={c.key} className={cn("px-5 py-3 text-ink", c.hideBelow && HIDE[c.hideBelow], c.className)}>
                  {c.key === linkCol && onRowHref ? (
                    <Link href={onRowHref(r)} className="rounded-sm font-medium text-brand underline-offset-4 hover:underline">
                      {c.cell(r)}
                    </Link>
                  ) : (
                    c.cell(r)
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Pager({ page, pages, total, onPage }: { page: number; pages: number; total: number; onPage: (p: number) => void }) {
  if (pages <= 1) return <p className="mt-4 text-xs text-faint-ink numerals-tabular">{total} total</p>;
  return (
    <nav aria-label="Pagination" className="mt-4 flex items-center justify-between gap-3 text-sm">
      <span className="text-faint-ink numerals-tabular">
        Page {page} of {pages} · {total} total
      </span>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          <ChevronLeft aria-hidden /> Previous
        </Button>
        <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          Next <ChevronRight aria-hidden />
        </Button>
      </div>
    </nav>
  );
}

/* ---------------------------- confirm & toasts ---------------------------- */

export function Confirm({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  pendingLabel,
  destructive,
  onConfirm,
  children,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  pendingLabel: string;
  destructive?: boolean;
  onConfirm: () => Promise<boolean | void>;
  children?: React.ReactNode;
}) {
  const [pending, setPending] = useState(false);
  return (
    <Dialog open={open} onOpenChange={(v) => !pending && onOpenChange(v)}>
      <DialogContent className="sm:w-[min(30rem,calc(100vw-3rem))]">
        <div className="overflow-y-auto px-5 pt-6 pb-5 sm:px-7">
          <DialogTitle className="pr-10 font-serif text-2xl text-ink">{title}</DialogTitle>
          <DialogDescription className="mt-2 text-[0.9375rem] text-muted-ink">{description}</DialogDescription>
          {children && <div className="mt-4">{children}</div>}
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              className={destructive ? "bg-destructive hover:bg-destructive/90" : undefined}
              disabled={pending}
              onClick={async () => {
                setPending(true);
                const keepOpen = await onConfirm();
                setPending(false);
                if (keepOpen !== true) onOpenChange(false);
              }}
            >
              {pending && <Spinner />}
              {pending ? pendingLabel : confirmLabel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

type Toast = { id: number; tone: "success" | "error"; text: string };
const ToastCtx = createContext<(tone: Toast["tone"], text: string) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((tone: Toast["tone"], text: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, tone, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed right-4 bottom-4 left-4 z-[60] flex flex-col items-end gap-2 sm:left-auto">
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.tone === "error" ? "alert" : "status"}
            className={cn(
              "pointer-events-auto flex max-w-sm items-start gap-2.5 rounded-md border bg-surface px-4 py-3 text-sm shadow-[0_20px_44px_-20px_rgba(32,33,36,0.35)]",
              t.tone === "error" ? "border-destructive/30 text-destructive" : "border-success/30 text-success",
            )}
          >
            {t.tone === "error" ? <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden /> : <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden />}
            <span className="text-ink">{t.text}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/* ------------------------------ form helpers ------------------------------ */

export function Labeled({
  id,
  label: text,
  hint,
  error,
  children,
  className,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {text}
      </label>
      <div className="mt-1.5">{children}</div>
      {hint && !error && <p className="mt-1.5 text-xs text-faint-ink">{hint}</p>}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

export const fmtDate = (v: string | null | undefined, withTime = false) =>
  v
    ? new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        ...(withTime ? { hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" } : { timeZone: "UTC" }),
      }).format(new Date(v))
    : "—";

export function Tabs({ tabs, value, onChange, label: aria }: { tabs: [string, string][]; value: string; onChange: (v: string) => void; label: string }) {
  return (
    <div role="tablist" aria-label={aria} className="flex gap-1 overflow-x-auto border-b border-rule">
      {tabs.map(([id, text]) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={value === id}
          onClick={() => onChange(id)}
          className={cn(
            "-mb-px min-h-11 shrink-0 border-b-2 px-3 text-sm font-medium transition-colors",
            value === id ? "border-brand text-brand" : "border-transparent text-muted-ink hover:text-ink",
          )}
        >
          {text}
        </button>
      ))}
    </div>
  );
}
