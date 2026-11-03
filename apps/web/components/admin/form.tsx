"use client";

import { Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { Labeled } from "@/components/admin/ui";
import { cn } from "@/lib/utils";

type Errors = Record<string, string>;

export function TextInput({ id, label, value, onChange, errors, hint, className, ...rest }: { id: string; label: string; value: string; onChange: (v: string) => void; errors?: Errors; hint?: string; className?: string } & Omit<React.ComponentProps<"input">, "value" | "onChange" | "id">) {
  const error = errors?.[id];
  return (
    <Labeled id={`f-${id}`} label={label} hint={hint} error={error} className={className}>
      <Input id={`f-${id}`} name={id} value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={!!error || undefined} aria-describedby={error ? `f-${id}-error` : undefined} {...rest} />
    </Labeled>
  );
}

export function TextArea({ id, label, value, onChange, errors, hint, rows = 5, className }: { id: string; label: string; value: string; onChange: (v: string) => void; errors?: Errors; hint?: string; rows?: number; className?: string }) {
  const error = errors?.[id];
  return (
    <Labeled id={`f-${id}`} label={label} hint={hint} error={error} className={className}>
      <Textarea id={`f-${id}`} name={id} value={value} rows={rows} onChange={(e) => onChange(e.target.value)} aria-invalid={!!error || undefined} />
    </Labeled>
  );
}

export function Select({ id, label, value, onChange, options, errors, className }: { id: string; label: string; value: string; onChange: (v: string) => void; options: [string, string][]; errors?: Errors; className?: string }) {
  return (
    <Labeled id={`f-${id}`} label={label} error={errors?.[id]} className={className}>
      <NativeSelect id={`f-${id}`} name={id} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map(([v, t]) => (
          <option key={v} value={v}>
            {t}
          </option>
        ))}
      </NativeSelect>
    </Labeled>
  );
}

export function Check({ id, label, checked, onChange }: { id: string; label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label htmlFor={`f-${id}`} className="flex min-h-11 items-center gap-2.5 text-sm text-ink">
      <input id={`f-${id}`} type="checkbox" className="size-4 accent-[var(--brand)]" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

/** A list of repeated sub-forms (tracks, dates, fees…) with add, remove and reorder. */
export function Repeater<T>({ title, items, onChange, blank, render, addLabel }: { title: string; items: T[]; onChange: (items: T[]) => void; blank: () => T; render: (item: T, update: (patch: Partial<T>) => void, index: number) => React.ReactNode; addLabel: string }) {
  const move = (i: number, d: number) => {
    const next = [...items];
    const [x] = next.splice(i, 1);
    next.splice(i + d, 0, x!);
    onChange(next);
  };
  return (
    <fieldset className="space-y-3">
      <legend className="font-serif text-xl text-ink">{title}</legend>
      {items.length === 0 && <p className="text-sm text-faint-ink">None yet.</p>}
      {items.map((item, i) => (
        <div key={i} className="rounded-md border border-rule bg-paper/50 p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-muted-ink numerals-tabular">#{i + 1}</span>
            <div className="flex gap-1">
              <Button type="button" variant="ghost" size="icon-sm" aria-label={`Move ${title} ${i + 1} up`} disabled={i === 0} onClick={() => move(i, -1)}>
                <ArrowUp aria-hidden />
              </Button>
              <Button type="button" variant="ghost" size="icon-sm" aria-label={`Move ${title} ${i + 1} down`} disabled={i === items.length - 1} onClick={() => move(i, 1)}>
                <ArrowDown aria-hidden />
              </Button>
              <Button type="button" variant="ghost" size="icon-sm" aria-label={`Remove ${title} ${i + 1}`} onClick={() => onChange(items.filter((_, j) => j !== i))}>
                <Trash2 aria-hidden className="text-destructive" />
              </Button>
            </div>
          </div>
          {render(item, (patch) => onChange(items.map((x, j) => (j === i ? { ...x, ...patch } : x))), i)}
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...items, blank()])}>
        <Plus aria-hidden /> {addLabel}
      </Button>
    </fieldset>
  );
}

export function FormGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("grid gap-4 sm:grid-cols-2", className)}>{children}</div>;
}

/** Moves focus to the first field the API flagged. */
export function focusFirstError(errors: Errors) {
  const first = Object.keys(errors)[0];
  if (first) requestAnimationFrame(() => document.getElementById(`f-${first.split(".")[0]}`)?.focus());
}
