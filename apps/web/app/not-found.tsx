import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarDays, Mail, Newspaper, Presentation, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { contact } from "@/lib/data/contact";
import { routes } from "@/lib/site";

export const metadata: Metadata = { title: "Page Not Found", robots: { index: false } };

const PLACES = [
  { href: routes.conferences, label: "Conferences", text: "Upcoming and past international conferences", icon: Presentation },
  { href: routes.mentorship, label: "Mentoring Directory", text: "Find a research mentor", icon: Users },
  { href: "/event", label: "Events", text: "Seminars, boot camps and Research Adda", icon: CalendarDays },
  { href: "/news", label: "News", text: "Conference reports and announcements", icon: Newspaper },
];

export default function NotFound() {
  return (
    <main id="main" className="flex flex-1 items-center bg-paper">
      <div className="container-site grid gap-12 py-16 md:py-24 lg:grid-cols-12 lg:items-center lg:gap-16">
        <div className="lg:col-span-6">
          <p aria-hidden className="font-serif text-[6rem] leading-none text-brand numerals-tabular sm:text-[8rem]">
            404
          </p>
          <h1 className="mt-4 font-serif text-h2 font-normal text-ink [text-wrap:balance]">Page Not Found</h1>
          <p className="mt-4 max-w-xl text-[1.0625rem] leading-relaxed text-muted-ink">
            The page you&apos;re looking for doesn&apos;t exist or has moved. Pages from the old RiTECHS website have new addresses; most old links
            are sent to the right place automatically.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/">Back to the Homepage</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href={`mailto:${contact.email}`}>
                <Mail aria-hidden /> Report a Broken Link
              </a>
            </Button>
          </div>
        </div>

        <nav aria-labelledby="nf-places" className="lg:col-span-6">
          <h2 id="nf-places" className="text-sm font-semibold text-brand">
            Popular Pages
          </h2>
          <ul className="mt-3 divide-y divide-rule rounded-lg border border-rule bg-surface">
            {PLACES.map(({ href, label, text, icon: Icon }) => (
              <li key={href}>
                <Link href={href} className="group flex min-h-16 items-center gap-4 px-5 py-4 transition-colors hover:bg-paper/70">
                  <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-md bg-brand-wash text-brand">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-ink group-hover:text-brand">{label}</span>
                    <span className="block text-sm text-muted-ink">{text}</span>
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-faint-ink transition-transform group-hover:translate-x-0.5 group-hover:text-brand" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </main>
  );
}
