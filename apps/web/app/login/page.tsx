import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { RedirectIfSignedIn } from "@/components/layout/account-nav";

export const metadata: Metadata = { title: "Log in", robots: { index: false } };

export default function LoginPage() {
  return (
    <AuthShell
      title="Log in"
      intro="Welcome back to the RiTECHS research community."
      points={["Track your submissions and reviews", "Register for conferences and events", "Message your mentor"]}
    >
      <Suspense>
        <RedirectIfSignedIn />
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
