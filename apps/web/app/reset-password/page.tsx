import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false }, referrer: "no-referrer" };

export default function ResetPasswordPage() {
  return (
    <AuthShell
      title="Choose a new password"
      intro="Pick a password you don't use anywhere else."
      points={["Changing it signs out every other device", "Use at least 10 characters", "A password manager makes this easy"]}
    >
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
