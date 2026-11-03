"use client";

import { useId, useState, useTransition } from "react";
import { CheckCircle2} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { subscribeToNewsletter } from "@/lib/api/newsletter";

type FormState = { kind: "idle" } | { kind: "success" } | { kind: "error"; message: string };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Newsletter sign-up for burgundy surfaces. Double opt-in: the address is added only after the emailed link is clicked. */
export function NewsletterForm() {
  const id = useId();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<FormState>({ kind: "idle" });
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const honeypot = String(new FormData(e.currentTarget).get("website") ?? "");
    const value = email.trim();
    if (!value) return setState({ kind: "error", message: "Enter your email address." });
    if (!EMAIL_RE.test(value)) return setState({ kind: "error", message: "Enter an email address like name@university.edu." });
    startTransition(async () => {
      const res = await subscribeToNewsletter(value, honeypot);
      if (res.ok) {
        setState({ kind: "success" });
        setEmail("");
      } else setState({ kind: "error", message: res.message });
    });
  }

  if (state.kind === "success") {
    return (
      <div role="status" className="flex items-start gap-3 rounded-lg border border-white/20 bg-white/[0.06] p-5">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-white" aria-hidden />
        <div>
          <p className="font-medium text-white">Almost done — check your inbox.</p>
          <p className="mt-1 text-sm text-white/70">Click the link in the email we sent to confirm your subscription.</p>
          <button
            type="button"
            onClick={() => setState({ kind: "idle" })}
            className="mt-3 rounded-sm text-sm text-white underline decoration-white/40 underline-offset-4 hover:decoration-white"
          >
            Subscribe Another Address
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate aria-label="Newsletter sign-up">
      {/* Honeypot for bots: hidden from people and assistive technology. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>
      <label htmlFor={`${id}-email`} className="text-sm font-medium text-white">
        Email address
      </label>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <input
          id={`${id}-email`}
          type="email"
          inputMode="email"
          autoComplete="email"
          spellCheck={false}
          placeholder="name@university.edu"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (state.kind === "error") setState({ kind: "idle" });
          }}
          aria-invalid={state.kind === "error" || undefined}
          aria-describedby={`${id}-hint ${id}-error`}
          className="h-12 w-full min-w-0 rounded-md sm:flex-1 border border-white/25 bg-white/[0.08] px-4 text-base text-white outline-none placeholder:text-white/50 focus-visible:border-white focus-visible:ring-2 focus-visible:ring-white/25 aria-invalid:border-[#ffb4c0]"
        />
        <Button type="submit" variant="inverse" size="lg" disabled={pending} className="h-12">
          {pending && <Spinner />}
          {pending ? "Subscribing…" : "Subscribe"}
        </Button>
      </div>
      <p id={`${id}-error`} aria-live="polite" className="mt-2 min-h-5 text-sm text-[#ffccd5]">
        {state.kind === "error" ? state.message : ""}
      </p>
      <p id={`${id}-hint`} className="text-xs text-white/60">
        One email a month at most. Unsubscribe at any time.
      </p>
    </form>
  );
}
