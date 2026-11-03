"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Field, Notice } from "@/components/auth/field";
import { resetPassword } from "@/lib/auth/client";
import { routes } from "@/lib/site";

export function ResetPasswordForm() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const [errors, setErrors] = useState<{ password?: string; confirm?: string; form?: string }>({});
  const [pending, startTransition] = useTransition();

  if (!token)
    return (
      <Notice tone="error">
        This reset link is incomplete. <Link href={routes.forgotPassword} className="font-medium underline underline-offset-4">Request a new link</Link>.
      </Notice>
    );

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    const password = String(d.get("password") ?? "");
    const confirm = String(d.get("confirm") ?? "");
    const next: typeof errors = {};
    if (password.length < 10) next.password = "Use at least 10 characters.";
    else if (!/[a-z]/i.test(password) || !/\d/.test(password)) next.password = "Include at least one letter and one number.";
    if (!next.password && confirm !== password) next.confirm = "The two passwords don't match.";
    setErrors(next);
    if (Object.keys(next).length) return document.getElementById(next.password ? "reset-password" : "reset-confirm")?.focus();
    startTransition(async () => {
      const res = await resetPassword(token, password);
      if (!res.ok) return setErrors(res.code === "PASSWORD_COMPROMISED" || res.code === "PASSWORD_TOO_SHORT" ? { password: res.message } : { form: res.message });
      router.replace(`${routes.login}?reset=1`);
    });
  }

  return (
    <>
      {errors.form && (
        <Notice tone="error">
          {errors.form} <Link href={routes.forgotPassword} className="font-medium underline underline-offset-4">Request a new link</Link>.
        </Notice>
      )}
      <form onSubmit={onSubmit} noValidate className="mt-8 space-y-5">
        <Field id="reset-password" name="password" label="New password" type="password" autoComplete="new-password" hint="At least 10 characters, with a letter and a number." error={errors.password} />
        <Field id="reset-confirm" name="confirm" label="Confirm new password" type="password" autoComplete="new-password" error={errors.confirm} />
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending && <Spinner />}
          {pending ? "Saving…" : "Set New Password"}
        </Button>
      </form>
    </>
  );
}
