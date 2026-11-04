import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroBackdrop } from "@/components/home/hero-backdrop";
import { getFeaturedConference } from "@/lib/server/content";
import { routes } from "@/lib/site";
import { formatDateRange, formatPublicationDate } from "@/lib/utils";

/** Full-width hero under the transparent header, in the style of usf.edu. */
export async function Hero() {
  const conf = await getFeaturedConference();
  const next = conf?.keyDates?.[0];
  const enter = "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-6 motion-safe:duration-700 motion-safe:fill-mode-both";
  return (
    <section data-hero-overlay aria-labelledby="hero-heading" className="relative isolate overflow-hidden text-white">
      <HeroBackdrop />
      <div className="container-site flex min-h-[min(100svh,52rem)] flex-col items-center justify-center pt-28 pb-14 text-center md:pt-36 md:pb-20">
        <h1
          id="hero-heading"
          className={`font-headline text-[clamp(2.75rem,1.2rem+6vw,6rem)] leading-[1.02] font-bold tracking-[0.005em] uppercase [text-wrap:balance] ${enter}`}
        >
          Advancing Research.
          <br />
          Inspiring Innovation.
        </h1>
        <p className={`mt-6 max-w-[40rem] text-lg leading-relaxed text-white/90 md:text-[1.25rem] ${enter} motion-safe:delay-150`}>
          Connecting researchers, scholars, and innovators through impactful publications, academic collaboration, and
          technology-driven solutions.
        </p>
        <div className={`mt-9 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row ${enter} motion-safe:delay-300`}>
          <Button asChild size="lg" variant="highlight">
            <Link href={routes.publications}>
              Explore Publications <ArrowRight aria-hidden />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline-inverse" className="border-white/70">
            <Link href={routes.register}>Join Our Research Community</Link>
          </Button>
        </div>
        {conf && (
          <Link
            href="#events"
            className={`group mt-10 inline-flex min-h-11 max-w-full items-center gap-3 rounded-full border border-white/30 bg-white/10 py-1.5 pr-4 pl-1.5 text-sm backdrop-blur-[2px] transition-colors hover:border-white/60 ${enter} motion-safe:delay-500`}
          >
            <span translate="no" className="shrink-0 rounded-full bg-highlight px-2.5 py-1 text-xs font-semibold text-on-highlight">
              {conf.shortTitle}
            </span>
            <span className="truncate text-white/90">
              {formatDateRange(conf.startsAt, conf.endsAt)}
              {next && (
                <span className="hidden sm:inline">
                  . {next.label}: {formatPublicationDate(next.date)}
                </span>
              )}
            </span>
            <ArrowRight className="size-3.5 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>
        )}
      </div>
    </section>
  );
}
