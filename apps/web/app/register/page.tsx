import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, GraduationCap, Users } from "lucide-react";
import { RedirectIfSignedIn } from "@/components/layout/account-nav";
import { PageHeader } from "@/components/page/page-header";
import { roleCopy } from "@/lib/data/registration";
import { routes } from "@/lib/site";

export const metadata: Metadata = {
  title: "Register",
  description: "Join RiTECHS as a mentor or a mentee.",
};

const options = [
  { role: "mentor" as const, href: routes.registerMentor, icon: Users, cta: "Register as a Mentor" },
  { role: "mentee" as const, href: routes.registerMentee, icon: GraduationCap, cta: "Register as a Mentee" },
];

export default function RegisterPage() {
  return (
    <main id="main" className="flex-1">
      <RedirectIfSignedIn />
      <PageHeader
        title="Join RiTECHS"
        description="Choose how you'd like to take part. You can be a mentor sharing your experience, or a mentee looking for guidance."
        crumbs={[{ label: "Home", href: "/" }, { label: "Register" }]}
      />
      <div className="container-site py-12 md:py-16">
        <ul className="grid max-w-4xl gap-5 md:grid-cols-2">
          {options.map(({ role, href, icon: Icon, cta }) => {
            const copy = roleCopy[role];
            return (
              <li key={role}>
                <article className="group relative flex h-full flex-col rounded-lg border border-rule bg-surface p-7 transition-[border-color,box-shadow] hover:border-brand/40 hover:shadow-[0_16px_32px_-24px_rgba(32,33,36,0.35)]">
                  <span className="inline-flex size-12 items-center justify-center rounded-md bg-brand-wash text-brand">
                    <Icon className="size-6" strokeWidth={1.6} aria-hidden />
                  </span>
                  <h2 className="mt-5 font-serif text-2xl text-ink">{role === "mentor" ? "Mentor" : "Mentee"}</h2>
                  <p className="mt-2 text-[0.9375rem] text-muted-ink">{copy.intro}</p>
                  <ul className="mt-5 space-y-2 text-[0.9375rem] text-ink">
                    {copy.points.map((p) => (
                      <li key={p} className="flex gap-2.5">
                        <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-brand" />
                        {p}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={href}
                    className="mt-auto inline-flex items-center gap-1.5 self-start rounded-sm pt-7 font-medium text-brand after:absolute after:inset-0"
                  >
                    {cta}
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </Link>
                </article>
              </li>
            );
          })}
        </ul>
        <p className="mt-8 text-[0.9375rem] text-muted-ink">
          Already have an account?{" "}
          <Link href={routes.login} className="font-medium text-brand underline decoration-brand/30 underline-offset-4">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
