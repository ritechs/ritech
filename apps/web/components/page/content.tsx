import Link from "next/link";
import { ArrowRight, Mail, Phone } from "lucide-react";
import { contact } from "@/lib/data/contact";
import { cn } from "@/lib/utils";

/** Two-column inner page body: main content with an optional sticky aside. */
export function PageBody({ children, aside, className }: { children: React.ReactNode; aside?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("container-site grid gap-12 py-12 md:py-16 lg:grid-cols-12 lg:gap-16", className)}>
      <div className={aside ? "min-w-0 lg:col-span-8" : "min-w-0 lg:col-span-12"}>{children}</div>
      {aside && <aside className="lg:col-span-4"><div className="space-y-6 lg:sticky lg:top-24">{aside}</div></aside>}
    </div>
  );
}

export function Prose({ paragraphs, className }: { paragraphs: string[]; className?: string }) {
  return (
    <div className={cn("max-w-[68ch] space-y-5 text-[1.0625rem] leading-[1.75] text-ink/90", className)}>
      {paragraphs.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </div>
  );
}

export function SectionTitle({ children, className, id }: { children: React.ReactNode; className?: string; id?: string }) {
  return (
    <h2 id={id} className={cn("mt-14 font-serif text-h3 font-normal text-ink first:mt-0 [text-wrap:balance]", className)}>
      {children}
    </h2>
  );
}

/** Ruled grid of titled statements (values, goals, reasons). */
export function TitledGrid({ items, columns = 2 }: { items: { title: string; text: string }[]; columns?: 2 | 3 }) {
  return (
    <ul className={cn("mt-6 grid gap-px overflow-hidden rounded-lg border border-rule bg-rule", columns === 3 ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2")}>
      {items.map((it) => (
        <li key={it.title} className="bg-surface p-6">
          <h3 className="font-serif text-xl text-ink">{it.title}</h3>
          <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted-ink">{it.text}</p>
        </li>
      ))}
    </ul>
  );
}

export function BulletList({ items, className }: { items: string[]; className?: string }) {
  return (
    <ul className={cn("mt-4 space-y-2.5", className)}>
      {items.map((t) => (
        <li key={t} className="flex gap-3 text-[1rem] leading-relaxed text-ink/90">
          <span aria-hidden className="mt-2.5 size-1.5 shrink-0 rounded-full bg-brand" />
          {t}
        </li>
      ))}
    </ul>
  );
}

/** A real sequence: numbered steps. */
export function Steps({ items }: { items: string[] }) {
  return (
    <ol className="mt-6 space-y-4">
      {items.map((t, i) => (
        <li key={i} className="grid grid-cols-[2.5rem_1fr] gap-x-4">
          <span aria-hidden className="inline-flex size-10 items-center justify-center rounded-full bg-brand-wash font-serif text-lg text-brand">
            {i + 1}
          </span>
          <p className="pt-2 text-[1rem] leading-relaxed text-ink/90">
            <span className="sr-only">Step {i + 1}: </span>
            {t}
          </p>
        </li>
      ))}
    </ol>
  );
}

export function ContactCard({ heading = "Contact us", person, children }: { heading?: string; person?: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-rule bg-paper p-6">
      <h2 className="font-serif text-xl text-ink">{heading}</h2>
      {children && <div className="mt-2 text-[0.9375rem] text-muted-ink">{children}</div>}
      {person && <p className="mt-3 text-[0.9375rem] text-ink">{person}</p>}
      <ul className="mt-4 space-y-1 text-[0.9375rem]">
        <li>
          <a href={contact.phone.href} className="tap-target gap-2.5 rounded-sm text-ink hover:text-brand">
            <Phone className="size-4 text-faint-ink" aria-hidden />
            {contact.phone.display}
          </a>
        </li>
        <li>
          <a href={`mailto:${contact.email}`} className="tap-target gap-2.5 rounded-sm text-ink hover:text-brand">
            <Mail className="size-4 text-faint-ink" aria-hidden />
            {contact.email}
          </a>
        </li>
      </ul>
    </div>
  );
}

export function LinkCard({ href, title, text }: { href: string; title: string; text?: string }) {
  return (
    <Link href={href} className="group block rounded-lg border border-rule bg-surface p-5 transition-colors hover:border-brand/40">
      <span className="flex items-center justify-between gap-3 font-serif text-lg text-ink group-hover:text-brand">
        {title}
        <ArrowRight className="size-4 shrink-0 text-brand transition-transform group-hover:translate-x-0.5" aria-hidden />
      </span>
      {text && <span className="mt-1.5 block text-sm leading-relaxed text-muted-ink">{text}</span>}
    </Link>
  );
}

/** Sibling-page navigation for a menu section (e.g. all About pages). */
export function SectionNav({ title, links, current }: { title: string; links: { label: string; href: string }[]; current: string }) {
  return (
    <nav aria-label={title} className="rounded-lg border border-rule bg-surface p-3">
      <p className="px-3 pt-2 pb-1 text-xs font-semibold text-brand">{title}</p>
      <ul>
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              aria-current={l.href === current ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center rounded-md px-3 text-[0.9375rem] transition-colors hover:bg-brand-wash",
                l.href === current ? "bg-brand-wash font-medium text-brand" : "text-ink",
              )}
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
