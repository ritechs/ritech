"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function Field({
  id,
  label,
  error,
  hint,
  type = "text",
  optional,
  ...props
}: React.ComponentProps<"input"> & { id: string; label: string; error?: string; hint?: string; optional?: boolean }) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;
  return (
    <div>
      <label htmlFor={id} className="flex items-baseline justify-between text-sm font-medium text-ink">
        {label}
        {optional && <span className="text-xs font-normal text-faint-ink">Optional</span>}
      </label>
      <div className="relative mt-1.5">
        <Input
          id={id}
          type={isPassword && show ? "text" : type}
          spellCheck={type === "email" ? false : undefined}
          aria-invalid={!!error || undefined}
          aria-describedby={describedBy}
          className={cn("h-12", isPassword && "pr-12")}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute top-0.5 right-0.5 inline-flex size-11 items-center justify-center rounded-md text-faint-ink hover:text-ink"
            aria-label={show ? "Hide password" : "Show password"}
            aria-pressed={show}
          >
            {show ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
          </button>
        )}
      </div>
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-faint-ink">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

/** Success / information box after a form is sent. */
export function Notice({ children, tone = "success" }: { children: React.ReactNode; tone?: "success" | "error" }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={
        tone === "error"
          ? "mt-6 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
          : "mt-6 rounded-md border border-success/30 bg-success-wash px-4 py-3 text-sm text-success"
      }
    >
      {children}
    </div>
  );
}
