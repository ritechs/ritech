import { Suspense } from "react";
import type { Metadata } from "next";
import { MemberRegisterForm } from "@/components/auth/member-register-form";
import { RegisterShell } from "@/components/auth/register-shell";
import { RedirectIfSignedIn } from "@/components/layout/account-nav";
import { getCountryOptions } from "@/lib/countries";

export const metadata: Metadata = {
  title: "Mentor registration",
  description: "Register as a RiTECHS mentor.",
};

export default async function MentorRegisterPage({ searchParams }: PageProps<"/register/mentor">) {
  return (
    <Suspense fallback={<RegisterShell role="mentor" query=""><div className="mt-8 h-[60rem] animate-pulse rounded-md bg-muted" aria-hidden /></RegisterShell>}>
      <Mentor searchParams={searchParams} />
    </Suspense>
  );
}

async function Mentor({ searchParams }: { searchParams: PageProps<"/register/mentor">["searchParams"] }) {
  const sp = await searchParams;
  const keep = new URLSearchParams();
  for (const k of ["event", "mentor"]) {
    const v = sp[k];
    if (typeof v === "string") keep.set(k, v);
  }
  const query = keep.size ? `?${keep}` : "";
  return (
    <RegisterShell role="mentor" query={query}>
      <RedirectIfSignedIn />
      <MemberRegisterForm role="mentor" countries={getCountryOptions()} />
    </RegisterShell>
  );
}
