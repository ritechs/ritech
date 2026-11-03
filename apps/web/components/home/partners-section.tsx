import { LegacyImage } from "@/components/media/legacy-image";
import { getPartners } from "@/lib/server/content";

/**
 * Institutions shown in the partner strip of the current RiTECHS site.
 * Logos come from the old site's uploads; a monogram shows if one fails to load.
 */
export async function PartnersSection() {
  const partners = await getPartners();
  return (
    <section aria-labelledby="partners-heading" className="border-t border-rule bg-surface py-14 md:py-16">
      <div className="container-site grid gap-8 lg:grid-cols-12 lg:items-center lg:gap-10">
        <div className="lg:col-span-3">
          <h2 id="partners-heading" className="font-serif text-h3 font-normal text-ink">
            Institutional Partners
          </h2>
          <p className="mt-2 text-[0.9375rem] text-muted-ink">Universities, publishers and organisations RiTECHS has worked with.</p>
        </div>
        <ul className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-rule bg-rule sm:grid-cols-3 md:grid-cols-4 lg:col-span-9 xl:grid-cols-5">
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
      </div>
    </section>
  );
}
