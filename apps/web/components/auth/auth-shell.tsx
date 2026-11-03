import Image from "next/image";
import { Check } from "lucide-react";
import { siteConfig } from "@/lib/site";

/** Two-column layout for login and registration: brand panel + form. */
export function AuthShell({ title, intro, points, children }: { title: string; intro: string; points: string[]; children: React.ReactNode }) {
  return (
    <main id="main" className="flex-1 bg-paper">
      <div className="container-site py-10 md:py-16">
        <div className="mx-auto grid max-w-5xl overflow-hidden rounded-xl border border-rule bg-surface shadow-[0_30px_60px_-40px_rgba(32,33,36,0.35)] lg:grid-cols-12">
          <aside className="relative hidden overflow-hidden bg-brand p-10 text-white lg:col-span-5 lg:flex lg:flex-col">
            <div aria-hidden className="pointer-events-none absolute -right-24 -bottom-24 size-80 rounded-full border border-white/10" />
            <div aria-hidden className="pointer-events-none absolute -right-10 -bottom-10 size-52 rounded-full border border-white/10" />
            <Image src={siteConfig.logo.onDark} alt="" width={siteConfig.logo.width} height={siteConfig.logo.height} className="h-14 w-auto self-start" />
            <p className="mt-12 font-serif text-[1.75rem] leading-snug">{intro}</p>
            <ul className="mt-8 space-y-3">
              {points.map((p) => (
                <li key={p} className="flex items-start gap-3 text-[0.9375rem] text-white/85">
                  <Check className="mt-0.5 size-4 shrink-0" aria-hidden />
                  {p}
                </li>
              ))}
            </ul>
          </aside>
          <div className="p-6 sm:p-10 lg:col-span-7 lg:p-12">
            <h1 className="font-serif text-h2 font-normal text-ink">{title}</h1>
            {children}
          </div>
        </div>
      </div>
    </main>
  );
}
