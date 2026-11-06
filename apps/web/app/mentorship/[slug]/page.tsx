import { RichContent } from "@/components/page/rich-text";
import { richExcerpt } from "@ritechs/shared";
import type { Metadata } from "next";
import { Suspense } from "react";
import { staticSlugs } from "@/lib/utils";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { ExternalLink, FileText, Image as ImageIcon, Link2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MentorAvatar } from "@/components/mentors/mentor-card";
import { MemberRequestButton, VisitorOnly } from "@/components/mentors/member-request";
import { PageHeader } from "@/components/page/page-header";
import { getMentorBySlug, getMentors } from "@/lib/server/content";
import { routes } from "@/lib/site";

export async function generateStaticParams() {
  return staticSlugs((await getMentors()).map((m) => m.slug));
}

const RESEARCH_LINKS: Record<string, string> = { orcid: "ORCID", scholar: "Google Scholar", scopus: "Scopus", researchgate: "ResearchGate", website: "Website" };
const SOCIAL_LINKS: Record<string, string> = { linkedin: "LinkedIn", twitter: "X (Twitter)", facebook: "Facebook", instagram: "Instagram" };

function LinkRow({ title, labels, links }: { title: string; labels: Record<string, string>; links: Record<string, string | undefined> }) {
  const items = Object.keys(labels).filter((k) => links[k]);
  if (!items.length) return null;
  return (
    <div>
      <dt className="text-sm text-faint-ink">{title}</dt>
      <dd className="mt-1 flex flex-wrap gap-x-5 gap-y-1">
        {items.map((k) => (
          <a key={k} href={links[k]} target="_blank" rel="noopener noreferrer nofollow" className="tap-target inline-flex items-center gap-1 rounded-sm text-brand underline-offset-4 hover:underline">
            {labels[k]}
            <ExternalLink className="size-3.5" aria-hidden />
          </a>
        ))}
      </dd>
    </div>
  );
}

export async function generateMetadata({ params }: PageProps<"/mentorship/[slug]">): Promise<Metadata> {
  const m = await getMentorBySlug((await params).slug);
  return m ? { title: `${m.name} — Mentor`, description: m.bio ? richExcerpt(m.bio, 155) : `${m.role}, ${m.organisation}` } : { title: "Mentor not found" };
}

async function MentorPageContent({ params }: { params: PageProps<"/mentorship/[slug]">["params"] }) {
  const { slug } = await params;
  const m = await getMentorBySlug(slug);
  if (!m) notFound();
  // Old ritechs.org links use the numeric profile id; send them to the canonical address.
  if (m.slug !== slug) permanentRedirect(routes.mentor(m.slug));
  return (
    <main id="main" className="flex-1">
      <PageHeader title={m.name} crumbs={[{ label: "Home", href: "/" }, { label: "Mentorship", href: routes.mentorship }, { label: m.name }]} />
      <div className="container-site grid gap-10 py-12 md:grid-cols-12 md:py-16">
        <div className="md:col-span-4 lg:col-span-3">
          <MentorAvatar mentor={m} size="lg" />
        </div>
        <div className="md:col-span-8 lg:col-span-6">
          <dl className="space-y-5 text-[1.0625rem]">
            {m.membership && (
              <div>
                <dt className="text-sm text-faint-ink">Membership</dt>
                <dd className="mt-1 text-ink">{m.membership}</dd>
              </div>
            )}
            <div>
              <dt className="text-sm text-faint-ink">Role</dt>
              <dd className="mt-1 text-ink">{m.role}</dd>
            </div>
            <div>
              <dt className="text-sm text-faint-ink">Organisation</dt>
              <dd className="mt-1 text-ink">{m.organisation}</dd>
            </div>
            <div>
              <dt className="text-sm text-faint-ink">Location</dt>
              <dd className="mt-1 flex items-center gap-2 text-ink">
                <MapPin className="size-4 text-faint-ink" aria-hidden />
                {m.location}
              </dd>
            </div>
            {m.qualification && (
              <div>
                <dt className="text-sm text-faint-ink">Qualification</dt>
                <dd className="mt-1 text-ink">{m.qualification}</dd>
              </div>
            )}
            {m.researchField && (
              <div>
                <dt className="text-sm text-faint-ink">Field of research</dt>
                <dd className="mt-1 text-ink">{m.researchField}</dd>
              </div>
            )}
            <div>
              <dt className="text-sm text-faint-ink">Research expertise</dt>
              <dd className="mt-1 text-ink">
                {m.expertise.length ? m.expertise.join(", ") : <span className="text-muted-ink italic">To be confirmed</span>}
              </dd>
            </div>
            {m.citations ? (
              <div>
                <dt className="text-sm text-faint-ink">Google Scholar citations</dt>
                <dd className="mt-1 text-ink numerals-tabular">{new Intl.NumberFormat("en-GB").format(m.citations)}</dd>
              </div>
            ) : null}
            {m.links && <LinkRow title="Research profiles" labels={RESEARCH_LINKS} links={m.links} />}
            {m.links && <LinkRow title="Social media" labels={SOCIAL_LINKS} links={m.links} />}
          </dl>
          {m.bio && (
            <section aria-labelledby="bio-heading" className="mt-10 border-t border-rule pt-8">
              <h2 id="bio-heading" className="font-serif text-2xl text-ink">Biography</h2>
              <RichContent value={m.bio} className="mt-4 max-w-[65ch] text-[1.0625rem] leading-[1.75] text-ink/90" />
            </section>
          )}
          {m.projects && m.projects.length > 0 && (
            <section aria-labelledby="projects-heading" className="mt-10 border-t border-rule pt-8">
              <h2 id="projects-heading" className="font-serif text-2xl text-ink">Research Projects</h2>
              <ul className="mt-4 max-w-[65ch] divide-y divide-rule">
                {m.projects.map((p) => (
                  <li key={p.title} className="py-3 first:pt-0">
                    <p className="text-[1.0625rem] leading-snug text-ink">{p.title}</p>
                    {(p.topic || p.year || p.collaborators) && <p className="mt-1 text-sm text-muted-ink">{[p.topic, p.collaborators && `with ${p.collaborators}`, p.year].filter(Boolean).join(" · ")}</p>}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {m.courses && m.courses.length > 0 && (
            <section aria-labelledby="courses-heading" className="mt-10 border-t border-rule pt-8">
              <h2 id="courses-heading" className="font-serif text-2xl text-ink">Courses</h2>
              <ul className="mt-4 grid gap-4">
                {m.courses.map((c) => (
                  <li key={c.id} className="rounded-lg border border-rule p-5">
                    <h3 className="font-serif text-xl text-ink">{c.title}</h3>
                    <p className="mt-1 text-sm text-muted-ink">
                      {[c.duration ? `${c.duration} ${c.durationUnit}${c.duration === 1 ? "" : "s"}` : null, c.fee && Number(c.fee) > 0 ? new Intl.NumberFormat("en-GB", { style: "currency", currency: c.currency }).format(Number(c.fee)) : "Free"].filter(Boolean).join(" · ")}
                    </p>
                    {c.description && <RichContent value={c.description} compact className="mt-3 max-w-[65ch] text-[0.9375rem] leading-relaxed text-ink/85" />}
                    <div className="mt-4">
                      <MemberRequestButton target={{ kind: "course", courseId: c.id }} label="Ask to Join" title={`Join “${c.title}”`} description={`Send ${m.name} a request for a place on this course.`} variant="outline" size="sm" />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {m.resources && m.resources.length > 0 && (
            <section aria-labelledby="resources-heading" className="mt-10 border-t border-rule pt-8">
              <h2 id="resources-heading" className="font-serif text-2xl text-ink">Resources</h2>
              <ul className="mt-4 max-w-[65ch] divide-y divide-rule">
                {m.resources.map((r) => {
                  const Icon = r.kind === "pdf" ? FileText : r.kind === "image" ? ImageIcon : Link2;
                  return (
                    <li key={r.id}>
                      <a href={r.href} target="_blank" rel="noopener noreferrer nofollow" className="flex min-h-12 items-center gap-3 py-2 text-[1.0625rem] text-ink underline-offset-4 hover:text-brand hover:underline">
                        <Icon className="size-5 shrink-0 text-brand" aria-hidden />
                        <span className="min-w-0 flex-1">{r.title}</span>
                        <span className="text-xs text-faint-ink uppercase">{r.kind === "link" ? "Link" : r.kind}</span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <MemberRequestButton
              target={{ kind: "mentorship", mentor: m.slug }}
              label="Request Mentorship"
              title={`Ask ${m.name} to Mentor You`}
              description="Introduce yourself and say what you would like help with. They can accept or decline, and we email you either way."
              minLength={10}
            />
            <Button asChild variant="outline">
              <Link href={routes.mentorship}>All Mentors</Link>
            </Button>
          </div>
          <VisitorOnly>
            <p className="mt-3 text-sm text-muted-ink">
              New to RiTECHS?{" "}
              <Link href={`${routes.registerMentee}?mentor=${m.slug}`} className="text-brand underline-offset-4 hover:underline">
                Register as a mentee
              </Link>{" "}
              to send requests.
            </p>
          </VisitorOnly>
        </div>
      </div>
    </main>
  );
}

/**
 * `params` is read inside Suspense so pages added after the build (a new
 * conference, article or mentor) render on their first visit and are then cached.
 */
export default function MentorPage({ params }: PageProps<"/mentorship/[slug]">) {
  return (
    <Suspense fallback={<main id="main" className="min-h-[70vh] flex-1 bg-paper" aria-busy="true" />}>
      <MentorPageContent params={params} />
    </Suspense>
  );
}
