import Image from "next/image";
import Link from "next/link";
import { Check } from "lucide-react";
import { roleCopy, type MemberRole } from "@/lib/data/registration";
import { routes, siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";

/** Registration layout: brand panel (sticky on desktop), role switch and the form. */
export function RegisterShell({ role, query, children }: { role: MemberRole; query: string; children: React.ReactNode }) {
  const copy = roleCopy[role];
  const tabs: { role: MemberRole; label: string; href: string }[] = [
    { role: "mentor", label: "Mentor", href: routes.registerMentor + query },
    { role: "mentee", label: "Mentee", href: routes.registerMentee + query },
  ];
  return (
    <main id="main" className="flex-1 bg-paper">
      <div className="container-site py-8 md:py-14">
        <div className="mx-auto grid max-w-6xl overflow-hidden rounded-xl border border-rule bg-surface shadow-[0_30px_60px_-40px_rgba(32,33,36,0.35)] lg:grid-cols-12">
          <aside className="relative hidden bg-brand text-white lg:col-span-4 lg:block">
            <div className="sticky top-24 p-10">
              <Image src={siteConfig.logo.onDark} alt="" width={siteConfig.logo.width} height={siteConfig.logo.height} className="h-14 w-auto" />
              <p className="mt-12 font-serif text-[1.625rem] leading-snug">{copy.intro}</p>
              <ul className="mt-8 space-y-3">
                {copy.points.map((p) => (
                  <li key={p} className="flex items-start gap-3 text-[0.9375rem] text-white/85">
                    <Check className="mt-0.5 size-4 shrink-0" aria-hidden />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          <div className="p-6 sm:p-10 lg:col-span-8 lg:p-12">
            <nav aria-label="Registration type" className="inline-flex rounded-lg border border-rule bg-paper p-1">
              {tabs.map((t) => (
                <Link
                  key={t.role}
                  href={t.href}
                  aria-current={t.role === role ? "page" : undefined}
                  className={cn(
                    "inline-flex h-11 min-w-28 items-center justify-center rounded-md px-4 text-sm font-medium transition-colors",
                    t.role === role ? "bg-surface text-brand shadow-[0_1px_3px_rgba(32,33,36,0.12)]" : "text-muted-ink hover:text-ink",
                  )}
                >
                  {t.label}
                </Link>
              ))}
            </nav>
            <h1 className="mt-6 font-serif text-h2 font-normal text-ink">{copy.title}</h1>
            <p className="mt-2 text-[0.9375rem] text-muted-ink lg:hidden">{copy.intro}</p>
            {children}
          </div>
        </div>
      </div>
    </main>
  );
}
