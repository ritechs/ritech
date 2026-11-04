import { Reveal } from "@/components/home/reveal";
import { SectionHeading } from "@/components/home/section-heading";
import { LegacyImage } from "@/components/media/legacy-image";
import { getPartners } from "@/lib/server/content";

/**
 * Institutions shown in the partner strip of the current RiTECHS site.
 * Logos come from the old site's uploads; a monogram shows if one fails to load.
 */
export async function PartnersSection() {
  const partners = await getPartners();
  return (
    <section aria-labelledby="partners-heading" className="border-t border-rule bg-surface py-16 md:py-20">
      <div className="container-site">
        <SectionHeading
          id="partners-heading"
          title="Institutional Partners"
          description="Universities, publishers and organisations RiTECHS has worked with."
          align="center"
        />
        <Reveal fade as="div" className="mt-10">
        <ul className="grid grid-cols-2 gap-px overflow-hidden border border-rule bg-rule sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
          {partners.map((p) => (
            <li key={p.name} className="flex min-h-28 flex-col items-center justify-center gap-3 bg-surface px-4 py-6 text-center">
              <a
                href={p.href}
                target="_blank"
                rel="noopener noreferrer"
                className="relative block h-14 w-full rounded-sm"
                title={p.name}
              >
                <LegacyImage
                  path={p.logo}
                  alt={p.name}
                  sizes="180px"
                  fit="contain"
                  fallback={
                    <span className="flex h-full flex-col items-center justify-center gap-1">
                      <span aria-hidden className="text-xs font-semibold tracking-wide text-faint-ink">{p.monogram}</span>
                      <span className="text-sm leading-snug text-muted-ink [text-wrap:balance]">{p.name}</span>
                    </span>
                  }
                />
              </a>
            </li>
          ))}
        </ul>
        </Reveal>
      </div>
    </section>
  );
}
