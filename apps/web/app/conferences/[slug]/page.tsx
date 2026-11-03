import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Download, ExternalLink, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page/page-header";
import { BulletList, ContactCard, PageBody, Prose, SectionTitle } from "@/components/page/content";
import { RichText } from "@/components/page/rich-text";
import { ConferenceStatus, conferenceStatus } from "@/components/conferences/conference-card";
import { LegacyImage } from "@/components/media/legacy-image";
import { getConferencePage, getConferences, type FeeRow } from "@/lib/server/content";
import { routes } from "@/lib/site";
import { getToday } from "@/lib/today";
import { formatDateRange, formatPublicationDate, initials, staticSlugs } from "@/lib/utils";

export async function generateStaticParams() {
  return staticSlugs((await getConferences()).filter((c) => !c.externalUrl).map((c) => c.slug));
}

export async function generateMetadata({ params }: PageProps<"/conferences/[slug]">): Promise<Metadata> {
  const c = await getConferencePage(decodeURIComponent((await params).slug));
  return c ? { title: `${c.acronym} — ${c.title}`, description: (c.summary ?? c.objective ?? plain(c.details.aboutHtml)).slice(0, 155) } : { title: "Conference not found" };
}

const plain = (html?: string) => (html ?? "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
const norm = (v: string) => v.toLowerCase().replace(/[^a-z0-9]+/g, "");

/** Fee columns present in at least one row, labelled for how this conference prices registration. */
function feeColumns(fees: FeeRow[]) {
  const hasOverseas = fees.some((f) => f.overseas);
  const split = fees.some((f) => f.early || f.online);
  const cols: { key: keyof FeeRow; label: string }[] = [
    { key: "early", label: "Early-bird (in person)" },
    { key: "regular", label: hasOverseas ? "Local participants" : split ? "Regular (in person)" : "Fee" },
    { key: "online", label: "Online" },
    { key: "overseas", label: "Overseas participants" },
  ];
  return cols.filter((c) => fees.some((f) => f[c.key]));
}

const SOCIAL_LABEL: Record<string, string> = { facebook: "Facebook", linkedin: "LinkedIn", twitter: "X (Twitter)", youtube: "YouTube", instagram: "Instagram", website: "Website" };

async function ConferencePageContent({ params }: { params: PageProps<"/conferences/[slug]">["params"] }) {
  const c = await getConferencePage(decodeURIComponent((await params).slug));
  if (!c || c.externalUrl) notFound();
  const today = await getToday();
  const status = conferenceStatus(c, today);
  const d = c.details;

  return (
    <main id="main" className="flex-1">
      <PageHeader
        title={c.title}
        crumbs={[{ label: "Home", href: "/" }, { label: "Conference", href: routes.conferences }, { label: c.acronym }]}
      >
        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[0.9375rem] text-ink">
          <span className="font-serif text-xl text-brand" translate="no">{c.acronym}</span>
          <ConferenceStatus status={status} />
          {c.startDate && (
            <span className="inline-flex items-center gap-2">
              <CalendarDays className="size-4 text-brand" aria-hidden />
              {formatDateRange(c.startDate, c.endDate ?? c.startDate)}
            </span>
          )}
          {c.location && (
            <span className="inline-flex items-center gap-2">
              <MapPin className="size-4 text-brand" aria-hidden />
              {c.location}
              {c.format === "Hybrid" && " (hybrid)"}
            </span>
          )}
        </div>
        {status === "upcoming" && (
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Button asChild><Link href={`${routes.register}?event=${c.slug}`}>Register Your Interest</Link></Button>
            {d.submissionHtml && <Button asChild variant="outline"><a href="#submission">Paper Submission Guide</a></Button>}
            {c.submissionUrl && <Button asChild variant="outline"><a href={c.submissionUrl} target="_blank" rel="noopener noreferrer">Submit a Paper</a></Button>}
          </div>
        )}
        {d.callForPapersUrl && (
          <a href={d.callForPapersUrl} target="_blank" rel="noopener noreferrer" className="tap-target mt-5 inline-flex items-center gap-2 rounded-sm text-[0.9375rem] font-medium text-brand hover:underline">
            <Download className="size-4" aria-hidden /> Call for Papers (PDF)
          </a>
        )}
      </PageHeader>

      <PageBody
        aside={
          <>
            {c.keyDates.length > 0 && (
              <section className="rounded-lg border border-rule bg-surface p-6">
                <h2 className="font-serif text-xl text-ink">Important Dates</h2>
                <ol className="mt-4 divide-y divide-rule">
                  {c.keyDates.map((k) => (
                    <li key={k.label} className="flex flex-col gap-0.5 py-3 first:pt-0 last:pb-0">
                      <span className="text-sm text-muted-ink">{k.label}</span>
                      <time dateTime={k.date} className="font-medium text-ink numerals-tabular">{formatPublicationDate(k.date)}</time>
                    </li>
                  ))}
                </ol>
              </section>
            )}
            {d.coverUrl && (
              <figure className="overflow-hidden rounded-lg border border-rule bg-paper">
                <div className="relative aspect-[3/4]">
                  <LegacyImage
                    path={d.coverUrl}
                    alt={`${c.acronym} conference poster`}
                    sizes="(min-width: 1024px) 22rem, 100vw"
                    fit="contain"
                    fallback={
                      <a href={d.coverUrl} target="_blank" rel="noopener noreferrer" className="absolute inset-0 flex items-center justify-center p-6 text-center font-medium text-brand hover:underline">
                        View the {c.acronym} poster
                      </a>
                    }
                  />
                </div>
              </figure>
            )}
            {d.socialLinks.length > 0 && (
              <section className="rounded-lg border border-rule bg-surface p-6">
                <h2 className="font-serif text-xl text-ink">Follow {c.acronym}</h2>
                <ul className="mt-3 space-y-1">
                  {d.socialLinks.map((l) => (
                    <li key={l.url}>
                      <a href={l.url} target="_blank" rel="noopener noreferrer" className="tap-target inline-flex items-center gap-2 rounded-sm text-[0.9375rem] font-medium text-brand hover:underline">
                        {SOCIAL_LABEL[l.network] ?? "Link"} <ExternalLink className="size-3.5" aria-hidden />
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <ContactCard heading="Questions about this conference?" />
          </>
        }
      >
        {d.highlightsHtml && (
          <div className="mb-8 rounded-lg border-l-2 border-brand bg-paper px-6 py-5 [&_strong]:font-medium">
            <RichText html={d.highlightsHtml} />
          </div>
        )}
        {d.aboutHtml && <RichText html={d.aboutHtml} />}
        {c.objective && !norm(plain(d.aboutHtml)).includes(norm(c.objective).slice(0, 120)) && (
          <>
            <SectionTitle className={d.aboutHtml ? undefined : "mt-0"}>Objective</SectionTitle>
            <Prose paragraphs={[c.objective]} className="mt-4" />
          </>
        )}
        {c.publication.length > 0 && !d.highlightsHtml && (
          <>
            <SectionTitle>Publication</SectionTitle>
            <BulletList items={c.publication} />
          </>
        )}
        {d.joinUsHtml && (
          <>
            <SectionTitle>Join Us</SectionTitle>
            <RichText html={d.joinUsHtml} className="mt-4" />
          </>
        )}

        {c.tracks.length > 0 && (
          <>
            <SectionTitle>Major Tracks</SectionTitle>
            {c.tracks.some((t) => t.description || t.scope || t.chairs?.length) ? (
              <ol className="mt-6 space-y-3">
                {c.tracks.map((t, i) => (
                  <li key={t.title}>
                    <details className="group rounded-lg border border-rule bg-surface open:border-rule-strong">
                      <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-5 py-3 font-serif text-lg text-ink [&::-webkit-details-marker]:hidden">
                        <span className="text-brand numerals-tabular">{i + 1}.</span>
                        <span className="flex-1">{t.title}</span>
                        <span aria-hidden className="text-faint-ink transition-transform group-open:rotate-45">+</span>
                      </summary>
                      <div className="space-y-3 border-t border-rule px-5 py-4 text-[0.9375rem] leading-relaxed text-ink/90">
                        {t.description && <p>{t.description}</p>}
                        {t.scope && (
                          <p>
                            <span className="font-medium text-ink">Scope: </span>
                            {t.scope}
                          </p>
                        )}
                        {t.chairs && (
                          <p>
                            <span className="font-medium text-ink">Track chairs: </span>
                            {t.chairs.join("; ")}
                          </p>
                        )}
                      </div>
                    </details>
                  </li>
                ))}
              </ol>
            ) : (
              <BulletList items={c.tracks.map((t) => t.title)} />
            )}
          </>
        )}

        {c.speakers.length > 0 && (
          <>
            <SectionTitle>Speakers</SectionTitle>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {c.speakers.map((s) => (
                <li key={s.name} className="flex items-center gap-4 rounded-lg border border-rule bg-surface p-4">
                  <span className="relative inline-flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-brand-wash font-serif text-lg text-brand">
                    <LegacyImage path={s.photo} alt="" sizes="56px" fallback={<span aria-hidden>{initials(s.name)}</span>} />
                  </span>
                  <div className="min-w-0">
                    <p className="font-serif text-[1.0625rem] leading-snug text-ink">{s.name}</p>
                    {(s.role || s.organisation) && (
                      <p className="text-sm text-muted-ink">{[s.role, s.organisation].filter(Boolean).join(", ")}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}

        {c.generalChairs && !d.committee.length && (
          <>
            <SectionTitle>General Chairs</SectionTitle>
            <BulletList items={c.generalChairs} />
          </>
        )}

        {d.submissionHtml && (
          <>
            <SectionTitle id="submission">Paper Submission</SectionTitle>
            <RichText html={d.submissionHtml} className="mt-4" />
          </>
        )}

        {(d.cameraReadyHtml || d.cameraReadyUrl || d.cameraReadyFileUrl) && (
          <>
            <SectionTitle>Camera-Ready Paper</SectionTitle>
            {d.cameraReadyHtml && <RichText html={d.cameraReadyHtml} className="mt-4" />}
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
              {d.cameraReadyUrl && (
                <a href={d.cameraReadyUrl} target="_blank" rel="noopener noreferrer" className="tap-target inline-flex items-center gap-2 rounded-sm text-[0.9375rem] font-medium text-brand hover:underline">
                  Submission and Templates <ExternalLink className="size-3.5" aria-hidden />
                </a>
              )}
              {d.cameraReadyFileUrl && (
                <a href={d.cameraReadyFileUrl} target="_blank" rel="noopener noreferrer" className="tap-target inline-flex items-center gap-2 rounded-sm text-[0.9375rem] font-medium text-brand hover:underline">
                  <Download className="size-4" aria-hidden /> Camera-Ready Guidelines (PDF)
                </a>
              )}
            </div>
          </>
        )}

        {d.fees.length > 0 && (
          <>
            <SectionTitle>Registration Fees</SectionTitle>
            {d.feesNote && <p className="mt-3 text-[0.9375rem] text-muted-ink">{d.feesNote}</p>}
            <div className="mt-6 overflow-x-auto rounded-lg border border-rule">
              <table className="w-full min-w-[28rem] text-left text-[0.9375rem]">
                <caption className="sr-only">{c.acronym} registration fees</caption>
                <thead className="bg-paper text-sm text-muted-ink">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-medium">Category</th>
                    {feeColumns(d.fees).map((col) => (
                      <th key={col.key} scope="col" className="px-4 py-3 font-medium">{col.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule numerals-tabular">
                  {d.fees.map((f) => (
                    <tr key={f.category}>
                      <th scope="row" className="px-4 py-3 font-medium text-ink">{f.category}</th>
                      {feeColumns(d.fees).map((col) => (
                        <td key={col.key} className="px-4 py-3">{f[col.key] ?? (col.key === "overseas" ? f.regular : "—")}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {d.awards.length > 0 && (
          <>
            <SectionTitle>Best Paper Awards</SectionTitle>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {d.awards.map((a) => (
                <li key={a.title} className="flex items-center justify-between gap-4 rounded-lg border border-rule bg-surface p-4">
                  <span className="text-ink">{a.title}</span>
                  <span className="font-serif text-xl text-brand numerals-tabular">{a.prize}</span>
                </li>
              ))}
            </ul>
          </>
        )}

        {d.sponsorship.length > 0 && (
          <>
            <SectionTitle>Sponsorship</SectionTitle>
            <p className="mt-3 text-[1rem] text-muted-ink">Sponsors build international visibility and connect with academics, researchers, entrepreneurs and business leaders.</p>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {d.sponsorship.map((t) => (
                <section key={t.tier} className="rounded-lg border border-rule bg-surface p-6">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="font-serif text-xl text-ink">{t.tier}</h3>
                    <span className="font-serif text-xl text-brand numerals-tabular">{t.price}</span>
                  </div>
                  {t.availability && <p className="text-sm text-faint-ink">{t.availability}</p>}
                  <BulletList items={t.highlights} className="[&_li]:text-[0.9375rem]" />
                </section>
              ))}
            </div>
          </>
        )}

        {d.sponsors.length > 0 && (
          <>
            <SectionTitle>Sponsors and Partners</SectionTitle>
            <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {d.sponsors.map((sp) => {
                const body = (
                  <>
                    <span className="relative flex h-16 w-full items-center justify-center">
                      <LegacyImage path={sp.logo} alt="" sizes="160px" fit="contain" fallback={<span className="font-serif text-lg text-brand">{initials(sp.name)}</span>} />
                    </span>
                    <span className="mt-3 text-center text-sm leading-snug text-ink">{sp.name}</span>
                  </>
                );
                return (
                  <li key={sp.name}>
                    {sp.website ? (
                      <a href={sp.website} target="_blank" rel="noopener noreferrer" className="flex h-full flex-col items-center rounded-lg border border-rule bg-surface p-4 transition-colors hover:border-rule-strong">{body}</a>
                    ) : (
                      <div className="flex h-full flex-col items-center rounded-lg border border-rule bg-surface p-4">{body}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}

        {d.committee.length > 0 && (
          <>
            <SectionTitle>Organising Committee</SectionTitle>
            <div className="mt-6 space-y-6">
              {d.committee.map((g) => (
                <section key={g.role}>
                  <h3 className="text-sm font-semibold text-brand">{g.role}</h3>
                  <ul className="mt-2 grid gap-x-8 gap-y-1.5 text-[0.9375rem] text-ink/90 sm:grid-cols-2">
                    {g.names.map((n) => (
                      <li key={n}>{n}</li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </>
        )}
      </PageBody>
    </main>
  );
}

/**
 * `params` is read inside Suspense so pages added after the build (a new
 * conference, article or mentor) render on their first visit and are then cached.
 */
export default function ConferencePage({ params }: PageProps<"/conferences/[slug]">) {
  return (
    <Suspense fallback={<main id="main" className="min-h-[70vh] flex-1 bg-paper" aria-busy="true" />}>
      <ConferencePageContent params={params} />
    </Suspense>
  );
}
