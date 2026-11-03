"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Field, Notice } from "@/components/auth/field";
import { requestPasswordReset } from "@/lib/auth/client";
import { routes } from "@/lib/site";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function ForgotPasswordForm() {
  const [error, setError] = useState<string>();
  const [sentTo, setSentTo] = useState<string>();
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email") ?? "").trim();
    if (!email) return setError("Enter the email address you registered with.");
    if (!EMAIL_RE.test(email)) return setError("Enter an email address like name@university.edu.");
    setError(undefined);
    startTransition(async () => {
      const res = await requestPasswordReset(email);
      // Same answer whether or not the account exists; only rate limits are reported.
      if (res.ok || res.status !== 429) setSentTo(email);
      else setError(res.message);
    });
  }

  return (
    <>
      <p className="mt-2 text-[0.9375rem] text-muted-ink">
        Enter your email and we&apos;ll send you a link to choose a new password.
      </p>
      {sentTo ? (
        <Notice>
          If an account exists for <strong className="font-medium">{sentTo}</strong>, we&apos;ve sent it a link to choose a new
          password. The link works once and expires in 30 minutes.
        </Notice>
      ) : (
        <form onSubmit={onSubmit} noValidate className="mt-8 space-y-5">
          <Field id="reset-email" name="email" label="Email address" type="email" autoComplete="email" error={error} />
          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending && <Spinner />}
            {pending ? "Sending…" : "Send Reset Link"}
          </Button>
        </form>
      )}
      <p className="mt-6 text-sm text-muted-ink">
        Remembered it?{" "}
        <Link href={routes.login} className="font-medium text-brand underline decoration-brand/30 underline-offset-4">
          Back to login
        </Link>
      </p>
    </>
  );
}
