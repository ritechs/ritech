"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Field, Notice } from "@/components/auth/field";
import { apiRaw } from "@/lib/api/client";
import { resendVerification, signIn, verifyBackupCode, verifyTwoFactor } from "@/lib/auth/client";
import { routes } from "@/lib/site";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Only same-site paths are accepted as a post-login destination (no open redirects). */
function safeNext(v: string | null) {
  return v && v.startsWith("/") && !v.startsWith("//") && !v.startsWith("/\\") ? v : null;
}

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [errors, setErrors] = useState<{ email?: string; password?: string; code?: string; form?: string }>({});
  const [step, setStep] = useState<"password" | "totp">("password");
  const [useBackup, setUseBackup] = useState(false);
  const [unverified, setUnverified] = useState<string>();
  const [pending, startTransition] = useTransition();
  /** After sign-in: the page that sent them here, else the admin dashboard for staff and the member dashboard for everyone else. */
  const done = async () => {
    const next = safeNext(params.get("next"));
    if (next) return router.replace(next);
    const me = await apiRaw<{ user: { role: string } }>("/me");
    router.replace(me.ok && (me.data.user.role === "admin" || me.data.user.role === "editor") ? "/admin" : routes.dashboard);
  };

  function onPassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");
    const next: typeof errors = {};
    if (!email) next.email = "Enter your email address.";
    else if (!EMAIL_RE.test(email)) next.email = "Enter an email address like name@university.edu.";
    if (!password) next.password = "Enter your password.";
    setErrors(next);
    setUnverified(undefined);
    if (Object.keys(next).length) return document.getElementById(next.email ? "login-email" : "login-password")?.focus();
    startTransition(async () => {
      const res = await signIn({ email, password, remember: data.get("remember") === "on" });
      if (!res.ok) {
        if (res.code === "EMAIL_NOT_VERIFIED") {
          setUnverified(email);
          return;
        }
        setErrors({ form: res.message });
        return;
      }
      if (res.twoFactorRedirect) {
        setStep("totp");
        return;
      }
      await done();
    });
  }

  function onCode(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const code = String(data.get("code") ?? "").replace(/\s+/g, "");
    if (!useBackup && !/^\d{6}$/.test(code)) {
      setErrors({ code: "Enter the 6-digit code from your authenticator app." });
      return document.getElementById("login-code")?.focus();
    }
    if (useBackup && code.length < 8) {
      setErrors({ code: "Enter one of your backup codes." });
      return document.getElementById("login-code")?.focus();
    }
    setErrors({});
    startTransition(async () => {
      const res = useBackup ? await verifyBackupCode(code) : await verifyTwoFactor(code, data.get("trust") === "on");
      if (!res.ok) {
        if (res.code === "INVALID_TWO_FACTOR_COOKIE") setStep("password");
        setErrors({ code: res.message });
        return;
      }
      await done();
    });
  }

  return (
    <>
      {params.get("verified") === "1" && <Notice>Your email is confirmed. You can log in now.</Notice>}
      {params.get("reset") === "1" && <Notice>Your password has been changed and every other device was signed out. Log in with your new password.</Notice>}
      {step === "password" ? (
        <>
          <p className="mt-2 text-[0.9375rem] text-muted-ink">
            New to RiTECHS? Register as a{" "}
            <Link href={routes.registerMentor} className="font-medium text-brand underline decoration-brand/30 underline-offset-4 hover:decoration-brand">
              mentor
            </Link>{" "}
            or a{" "}
            <Link href={routes.registerMentee} className="font-medium text-brand underline decoration-brand/30 underline-offset-4 hover:decoration-brand">
              mentee
            </Link>
            .
          </p>
          {errors.form && <Notice tone="error">{errors.form}</Notice>}
          {unverified && (
            <Notice tone="error">
              Please confirm your email address before logging in.{" "}
              <button
                type="button"
                className="font-medium underline underline-offset-4"
                onClick={() => startTransition(async () => {
                  await resendVerification(unverified);
                  setUnverified(undefined);
                  setErrors({ form: undefined });
                })}
              >
                Send the link again
              </button>
            </Notice>
          )}
          <form onSubmit={onPassword} noValidate className="mt-8 space-y-5">
            <Field id="login-email" name="email" label="Email address" type="email" autoComplete="email" error={errors.email} />
            <Field id="login-password" name="password" label="Password" type="password" autoComplete="current-password" error={errors.password} />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="flex min-h-11 items-center gap-2.5 text-sm text-ink">
                <input type="checkbox" name="remember" defaultChecked className="size-4 accent-[var(--brand)]" />
                Keep me signed in
              </label>
              <Link href={routes.forgotPassword} className="tap-target rounded-sm text-sm font-medium text-brand underline decoration-brand/30 underline-offset-4 hover:decoration-brand">
                Forgot password?
              </Link>
            </div>
            <Button type="submit" size="lg" className="w-full" disabled={pending}>
              {pending && <Spinner />}
              {pending ? "Logging In…" : "Log In"}
            </Button>
          </form>
        </>
      ) : (
        <form onSubmit={onCode} noValidate className="mt-8 space-y-5" aria-label="Two-factor verification">
          <p className="text-[0.9375rem] text-muted-ink">
            {useBackup ? "Enter one of the backup codes you saved when you turned on two-factor authentication." : "Open your authenticator app and enter the 6-digit code for RiTECHS."}
          </p>
          <Field
            id="login-code"
            name="code"
            label={useBackup ? "Backup code" : "Authentication code"}
            inputMode={useBackup ? "text" : "numeric"}
            autoComplete="one-time-code"
            placeholder={useBackup ? "e.g. abcd-efgh-ij…" : "e.g. 123456…"}
            error={errors.code}
          />
          {!useBackup && (
            <label className="flex min-h-11 items-center gap-2.5 text-sm text-ink">
              <input type="checkbox" name="trust" className="size-4 accent-[var(--brand)]" />
              Trust this device for 7 days
            </label>
          )}
          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending && <Spinner />}
            {pending ? "Verifying…" : "Verify"}
          </Button>
          <button type="button" onClick={() => { setUseBackup((v) => !v); setErrors({}); }} className="tap-target rounded-sm text-sm font-medium text-brand underline decoration-brand/30 underline-offset-4">
            {useBackup ? "Use the authenticator app instead" : "Use a backup code instead"}
          </button>
        </form>
      )}
    </>
  );
}
