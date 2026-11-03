import { Suspense } from "react";
import type { Metadata } from "next";
import { MemberRegisterForm } from "@/components/auth/member-register-form";
import { RegisterShell } from "@/components/auth/register-shell";
import { RedirectIfSignedIn } from "@/components/layout/account-nav";
import { getCountryOptions } from "@/lib/countries";

export const metadata: Metadata = {
  title: "Mentee registration",
  description: "Register as a RiTECHS mentee.",
};

export default async function MenteeRegisterPage({ searchParams }: PageProps<"/register/mentee">) {
  return (
    <Suspense fallback={<RegisterShell role="mentee" query=""><div className="mt-8 h-[60rem] animate-pulse rounded-md bg-muted" aria-hidden /></RegisterShell>}>
      <Mentee searchParams={searchParams} />
    </Suspense>
  );
}

async function Mentee({ searchParams }: { searchParams: PageProps<"/register/mentee">["searchParams"] }) {
  const sp = await searchParams;
  const keep = new URLSearchParams();
  for (const k of ["event", "mentor"]) {
    const v = sp[k];
    if (typeof v === "string") keep.set(k, v);
  }
  const query = keep.size ? `?${keep}` : "";
  return (
    <RegisterShell role="mentee" query={query}>
      <RedirectIfSignedIn />
      <MemberRegisterForm role="mentee" countries={getCountryOptions()} />
    </RegisterShell>
  );
}
