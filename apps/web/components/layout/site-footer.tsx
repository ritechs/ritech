import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { SocialLinks } from "@/components/layout/social-links";
import { CopyrightYear } from "@/components/layout/copyright-year";
import { contact } from "@/lib/data/contact";
import { getFeaturedConference } from "@/lib/server/content";
import { footerNav, legalNav, siteConfig } from "@/lib/site";

export async function SiteFooter() {
  // The featured (or next) conference leads the Conferences column; it changes with the admin setting.
  const featured = await getFeaturedConference();
  const nav = footerNav.map((g) =>
    featured && g.heading === "Conferences & Events" ? { ...g, links: [{ label: featured.shortTitle ?? featured.title, href: `/conferences/${featured.slug}` }, ...g.links] } : g,
  );
  return (
    <footer className="border-t border-rule bg-paper">
      <div className="container-site py-14 md:py-16">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-3">
            <Logo className="h-14" />
            <p className="mt-5 max-w-sm text-[0.9375rem] leading-relaxed text-muted-ink">{siteConfig.description}</p>
            <SocialLinks className="mt-5 -ml-2.5" />
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4 lg:col-span-6 lg:grid-cols-2 xl:grid-cols-4">
            {nav.map((group) => (
              <nav key={group.heading} aria-labelledby={`footer-${group.heading}`}>
                <h2 id={`footer-${group.heading}`} className="text-sm font-semibold text-brand">
                  {group.heading}
                </h2>
                <ul className="mt-3">
                  {group.links.map((l) => (
                    <li key={l.label}>
                      <Link
                        href={l.href}
                        className="inline-flex min-h-11 items-center rounded-sm text-[0.9375rem] md:min-h-9 text-muted-ink hover:text-ink hover:underline hover:decoration-ink/30 hover:underline-offset-4"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>

          <div className="lg:col-span-3">
            <h2 className="text-sm font-semibold text-brand">Contact</h2>
            <address className="mt-4 space-y-3 text-[0.9375rem] text-ink/85 not-italic">
              <p className="flex gap-3">
                <MapPin className="mt-1 size-4 shrink-0 text-faint-ink" aria-hidden />
                <span>
                  {contact.address.map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))}
                </span>
              </p>
              <p className="flex items-center gap-3">
                <Phone className="size-4 shrink-0 text-faint-ink" aria-hidden />
                <a href={contact.phone.href} className="tap-target rounded-sm hover:text-brand hover:underline hover:underline-offset-4">
                  {contact.phone.display}
                </a>
              </p>
              <p className="flex items-center gap-3">
                <Mail className="size-4 shrink-0 text-faint-ink" aria-hidden />
                <a href={`mailto:${contact.email}`} className="tap-target rounded-sm hover:text-brand hover:underline hover:underline-offset-4">
                  {contact.email}
                </a>
              </p>
            </address>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-rule pt-6 text-sm text-faint-ink md:flex-row md:items-center md:justify-between">
          <p>
            © <CopyrightYear /> {siteConfig.shortName}. All rights reserved.
          </p>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {legalNav.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="tap-target rounded-sm hover:text-ink">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
