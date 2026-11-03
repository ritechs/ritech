"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { Notice } from "@/components/auth/field";
import { apiRaw } from "@/lib/api/client";
import { useSession } from "@/lib/auth/session";
import { routes } from "@/lib/site";

type Target = { kind: "mentorship"; mentor: string } | { kind: "course"; courseId: string };

/**
 * Asks a mentor for mentorship or a place on a course. Visitors are sent to
 * sign in (or register as a mentee) first; members write a short message.
 */
export function MemberRequestButton({ target, label, title, description, minLength = 0, variant = "default", size }: { target: Target; label: string; title: string; description: string; minLength?: number; variant?: "default" | "outline"; size?: "sm" }) {
  const user = useSession();
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string>();
  const [fieldError, setFieldError] = useState<string>();
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  if (user === undefined)
    return (
      <Button variant={variant} size={size} disabled>
        {label}
      </Button>
    );
  if (!user)
    return (
      <Button asChild variant={variant} size={size}>
        <Link href={`${routes.login}?next=${encodeURIComponent(path)}`}>{label}</Link>
      </Button>
    );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (message.trim().length < minLength) {
      setFieldError(`Write at least ${minLength} characters: who you are and what you would like help with.`);
      document.getElementById("request-message")?.focus();
      return;
    }
    setFieldError(undefined);
    setPending(true);
    const res = await apiRaw("/me/workspace/requests", { method: "POST", body: { ...target, message } });
    setPending(false);
    if (res.ok) return setDone(true);
    if (res.code === "NO_MEMBER_PROFILE") setError("Requests are for RiTECHS members. Register as a mentee first.");
    else if (res.code === "MEMBERSHIP_NOT_APPROVED") setError("You can send requests once your membership has been approved.");
    else setError(res.message);
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => {
          setOpen(true);
          setDone(false);
          setError(undefined);
        }}
      >
        {label}
      </Button>
      <Dialog open={open} onOpenChange={(v) => !pending && setOpen(v)}>
        <DialogContent className="sm:w-[min(36rem,calc(100vw-3rem))]">
          <div className="overflow-y-auto px-5 pt-6 pb-5 sm:px-7">
            {done ? (
              <>
                <CircleCheck className="size-8 text-success" aria-hidden />
                <DialogTitle className="mt-3 pr-10 font-serif text-2xl text-ink">Request Sent</DialogTitle>
                <DialogDescription className="mt-2 text-[0.9375rem] text-muted-ink">We have emailed them. You will get an email when they reply, and you can follow the request in your dashboard.</DialogDescription>
                <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button variant="outline" onClick={() => setOpen(false)}>
                    Close
                  </Button>
                  <Button asChild>
                    <Link href={`${routes.dashboard}/requests?box=out`}>Open My Requests</Link>
                  </Button>
                </div>
              </>
            ) : (
              <form noValidate onSubmit={submit}>
                <DialogTitle className="pr-10 font-serif text-2xl text-ink">{title}</DialogTitle>
                <DialogDescription className="mt-2 text-[0.9375rem] text-muted-ink">{description}</DialogDescription>
                {error && (
                  <div className="mt-4">
                    <Notice tone="error">{error}</Notice>
                  </div>
                )}
                <label htmlFor="request-message" className="mt-5 block text-sm font-medium text-ink">
                  Your message{minLength ? "" : " (optional)"}
                </label>
                <Textarea
                  id="request-message"
                  name="message"
                  rows={6}
                  className="mt-1.5"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="I am a PhD student working on… and would value guidance on…"
                  aria-invalid={!!fieldError || undefined}
                  aria-describedby={fieldError ? "request-message-error" : "request-message-hint"}
                />
                {fieldError ? (
                  <p id="request-message-error" className="mt-1.5 text-sm text-destructive">
                    {fieldError}
                  </p>
                ) : (
                  <p id="request-message-hint" className="mt-1.5 text-xs text-faint-ink">
                    They see your name, position and organisation. Your email address is shared only if they accept.
                  </p>
                )}
                <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button type="button" variant="outline" disabled={pending} onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={pending}>
                    {pending && <Spinner />}
                    {pending ? "Sending…" : "Send Request"}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Shown to signed-out visitors only. */
export function VisitorOnly({ children }: { children: React.ReactNode }) {
  const user = useSession();
  return user === null ? <>{children}</> : null;
}
