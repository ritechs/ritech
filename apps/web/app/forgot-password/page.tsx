import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = { title: "Forgot password", robots: { index: false } };

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Reset your password"
      intro="Get back into your RiTECHS account."
      points={["Reset links expire after 30 minutes", "Check your spam folder if nothing arrives", `Still stuck? Email info@ritechs.org`]}
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
