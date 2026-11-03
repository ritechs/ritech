"use client";

import { useState, useTransition } from "react";
import { KeyRound, ShieldAlert, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Field, Notice } from "@/components/auth/field";
import { TwoFactorEnableFlow } from "@/components/auth/two-factor-enable";
import { apiRaw } from "@/lib/api/client";

const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d).{10,128}$/;

/** Two-step verification on/off. Optional unless the server requires it for admins (REQUIRE_STAFF_2FA). */
export function TwoFactorCard({ email, enabled, required, onChange }: { email: string; enabled: boolean; required: boolean; onChange: () => void }) {
  const [mode, setMode] = useState<"idle" | "enable" | "disable">("idle");
  const [error, setError] = useState<string>();
  const [done, setDone] = useState<string>();
  const [pending, startTransition] = useTransition();

  function disable(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const password = String(new FormData(e.currentTarget).get("password") ?? "");
    if (!password) {
      setError("Enter your password.");
      return document.getElementById("tf-off-password")?.focus();
    }
    startTransition(async () => {
      const res = await apiRaw("/auth/two-factor/disable", { body: { password } });
      if (!res.ok) return setError(res.code === "INVALID_PASSWORD" ? "That password is not correct." : res.message);
      setError(undefined);
      setMode("idle");
      setDone("Two-factor authentication is off.");
      onChange();
    });
  }

  return (
    <section aria-labelledby="tf-heading" className="rounded-lg border border-rule bg-surface p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 id="tf-heading" className="flex items-center gap-2 font-serif text-xl text-ink">
            {enabled ? <ShieldCheck className="size-5 text-success" aria-hidden /> : <ShieldAlert className="size-5 text-brand" aria-hidden />}
            Two-Step Verification
          </h2>
          <p className="mt-2 max-w-[60ch] text-[0.9375rem] text-ink/85">
            {enabled
              ? "On. Signing in needs your password and a code from your authenticator app."
              : required
                ? "Required for administrators: the admin area stays locked until you turn it on."
                : "Optional. Turn it on to stop anyone who learns your password from signing in."}
          </p>
        </div>
        {mode === "idle" &&
          (enabled ? (
            !required && (
              <Button variant="outline" onClick={() => (setMode("disable"), setDone(undefined))}>
                Turn Off
              </Button>
            )
          ) : (
            <Button onClick={() => (setMode("enable"), setDone(undefined))}>Turn On</Button>
          ))}
      </div>
      {done && <Notice tone="success">{done}</Notice>}
      {mode === "enable" && (
        <div className="mt-2 border-t border-rule pt-2">
          <TwoFactorEnableFlow
            email={email}
            onCancel={() => setMode("idle")}
            onDone={() => {
              setMode("idle");
              setDone("Two-factor authentication is on.");
              onChange();
            }}
          />
        </div>
      )}
      {mode === "disable" && (
        <form onSubmit={disable} noValidate className="mt-5 space-y-4 border-t border-rule pt-5">
          {error && <Notice tone="error">{error}</Notice>}
          <Field id="tf-off-password" name="password" type="password" label="Confirm your password" autoComplete="current-password" />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="outline" disabled={pending}>
              {pending && <Spinner />}
              {pending ? "Turning Off…" : "Turn Off Two-Step Verification"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setMode("idle")} disabled={pending}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}

/** Change password; other devices are signed out. */
export function ChangePasswordCard() {
  const [errors, setErrors] = useState<{ current?: string; next?: string; confirm?: string; form?: string }>({});
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const d = new FormData(form);
    const current = String(d.get("currentPassword") ?? "");
    const next = String(d.get("newPassword") ?? "");
    const confirm = String(d.get("confirmPassword") ?? "");
    const errs: typeof errors = {};
    if (!current) errs.current = "Enter your current password.";
    if (!PASSWORD_RULE.test(next)) errs.next = "Use 10 or more characters with letters and numbers.";
    else if (next === current) errs.next = "Choose a password different from your current one.";
    if (!errs.next && confirm !== next) errs.confirm = "The passwords don't match.";
    setErrors(errs);
    setDone(false);
    const first = errs.current ? "pw-current" : errs.next ? "pw-new" : errs.confirm ? "pw-confirm" : null;
    if (first) return document.getElementById(first)?.focus();
    startTransition(async () => {
      const res = await apiRaw("/auth/change-password", { body: { currentPassword: current, newPassword: next, revokeOtherSessions: true } });
      if (!res.ok) {
        if (res.code === "INVALID_PASSWORD") setErrors({ current: "That password is not correct." });
        else setErrors({ form: res.message });
        return;
      }
      form.reset();
      setDone(true);
    });
  }

  return (
    <section aria-labelledby="pw-heading" className="rounded-lg border border-rule bg-surface p-6">
      <h2 id="pw-heading" className="flex items-center gap-2 font-serif text-xl text-ink">
        <KeyRound className="size-5 text-brand" aria-hidden /> Change Password
      </h2>
      <p className="mt-2 text-[0.9375rem] text-ink/85">Other devices where you are signed in will be signed out.</p>
      {errors.form && <Notice tone="error">{errors.form}</Notice>}
      {done && <Notice tone="success">Your password has been changed.</Notice>}
      <form onSubmit={submit} noValidate className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field id="pw-current" name="currentPassword" type="password" label="Current password" autoComplete="current-password" error={errors.current} />
        </div>
        <Field id="pw-new" name="newPassword" type="password" label="New password" autoComplete="new-password" hint="10+ characters with letters and numbers." error={errors.next} />
        <Field id="pw-confirm" name="confirmPassword" type="password" label="Confirm new password" autoComplete="new-password" error={errors.confirm} />
        <div className="sm:col-span-2">
          <Button type="submit" disabled={pending}>
            {pending && <Spinner />}
            {pending ? "Changing…" : "Change Password"}
          </Button>
        </div>
      </form>
    </section>
  );
}
