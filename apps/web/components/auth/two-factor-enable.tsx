"use client";

import { useState, useTransition } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Field, Notice } from "@/components/auth/field";
import { apiRaw } from "@/lib/api/client";

/**
 * Turning on two-factor authentication: confirm the password, scan the QR
 * code, keep the backup codes, then prove it works with a first code.
 */
export function TwoFactorEnableFlow({ email, onDone, onCancel }: { email: string; onDone: () => void; onCancel?: () => void }) {
  const [step, setStep] = useState<"password" | "scan">("password");
  const [error, setError] = useState<string>();
  const [qr, setQr] = useState("");
  const [secret, setSecret] = useState("");
  const [codes, setCodes] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  function enable(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const password = String(new FormData(e.currentTarget).get("password") ?? "");
    if (!password) {
      setError("Enter your password.");
      return document.getElementById("tf-password")?.focus();
    }
    startTransition(async () => {
      const res = await apiRaw<{ totpURI: string; backupCodes: string[] }>("/auth/two-factor/enable", { body: { password } });
      if (!res.ok) return setError(res.code === "INVALID_PASSWORD" ? "That password is not correct." : res.message);
      setError(undefined);
      setSecret(new URL(res.data.totpURI).searchParams.get("secret") ?? "");
      setQr(await QRCode.toString(res.data.totpURI, { type: "svg", margin: 1, color: { dark: "#202124", light: "#ffffff" } }));
      setCodes(res.data.backupCodes);
      setStep("scan");
    });
  }

  function verify(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const code = String(new FormData(e.currentTarget).get("code") ?? "").replace(/\s+/g, "");
    if (!/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit code from your authenticator app.");
      return document.getElementById("tf-code")?.focus();
    }
    startTransition(async () => {
      const res = await apiRaw("/auth/two-factor/verify-totp", { body: { code } });
      if (!res.ok) return setError("That code is not correct. Check the time on your phone and try again.");
      onDone();
    });
  }

  return (
    <div>
      {error && <Notice tone="error">{error}</Notice>}
      {step === "password" ? (
        <form onSubmit={enable} noValidate className="mt-4 space-y-5">
          <p className="text-sm text-ink">
            Signed in as <strong className="font-medium">{email}</strong>.
          </p>
          <Field id="tf-password" name="password" type="password" label="Confirm your password" autoComplete="current-password" />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={pending}>
              {pending && <Spinner />}
              {pending ? "Preparing…" : "Continue"}
            </Button>
            {onCancel && (
              <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      ) : (
        <ol className="mt-4 space-y-6">
          <li>
            <p className="font-medium text-ink">1. Scan this code with your authenticator app</p>
            <div className="mt-3 w-48 rounded-md border border-rule bg-white p-2" role="img" aria-label="QR code for your authenticator app" dangerouslySetInnerHTML={{ __html: qr }} />
            <p className="mt-2 text-sm text-muted-ink">
              Can&apos;t scan? Enter this key instead: <code className="font-mono break-all text-ink">{secret}</code>
            </p>
          </li>
          <li>
            <p className="font-medium text-ink">2. Save your backup codes</p>
            <p className="mt-1 text-sm text-muted-ink">Each code works once if you lose your phone. Store them somewhere safe, such as a password manager.</p>
            <ul className="mt-3 grid grid-cols-2 gap-1.5 rounded-md border border-rule bg-paper p-3 font-mono text-sm text-ink sm:grid-cols-3">
              {codes.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </li>
          <li>
            <p className="font-medium text-ink">3. Enter the code your app shows</p>
            <form onSubmit={verify} noValidate className="mt-3 space-y-4">
              <Field id="tf-code" name="code" label="6-digit code" inputMode="numeric" autoComplete="one-time-code" placeholder="e.g. 123456…" />
              <Button type="submit" disabled={pending}>
                {pending && <Spinner />}
                {pending ? "Verifying…" : "Turn On Two-Factor"}
              </Button>
            </form>
          </li>
        </ol>
      )}
    </div>
  );
}
