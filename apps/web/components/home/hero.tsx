import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResearchNetwork } from "@/components/home/research-network";
import { getFeaturedConference } from "@/lib/server/content";
import { routes } from "@/lib/site";
import { formatDateRange, formatPublicationDate } from "@/lib/utils";

export async function Hero() {
  const conf = await getFeaturedConference();
  const next = conf?.keyDates?.[0];
  return (
    <section aria-labelledby="hero-heading" className="overflow-hidden bg-surface">
      <div className="container-site grid gap-14 pt-10 pb-16 md:pt-14 md:pb-20 lg:grid-cols-12 lg:items-center lg:gap-10 lg:pt-16 lg:pb-24 xl:gap-16">
        <div className="lg:col-span-7">
          <h1 id="hero-heading" className="max-w-[15ch] font-serif text-display font-normal text-ink [text-wrap:balance]">
            Advancing Research. Inspiring Innovation.
          </h1>
          <p className="mt-6 max-w-[34rem] text-lg leading-relaxed text-muted-ink md:text-[1.1875rem]">
            Connecting researchers, scholars, and innovators through impactful publications, academic collaboration, and
            technology-driven solutions.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href={routes.publications}>Explore Publications</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href={routes.register}>Join Our Research Community</Link>
            </Button>
          </div>
          {conf && (
          <Link
            href="#events"
            className="group mt-8 inline-flex min-h-11 max-w-full items-center gap-3 rounded-full border border-rule bg-paper py-1.5 pr-4 pl-1.5 text-sm text-ink transition-colors hover:border-brand/40"
          >
            <span translate="no" className="shrink-0 rounded-full bg-brand px-2.5 py-1 text-xs font-medium text-white">{conf.shortTitle}</span>
            <span className="truncate">
              {formatDateRange(conf.startsAt, conf.endsAt)}
              {next && <span className="hidden sm:inline">. {next.label}: {formatPublicationDate(next.date)}</span>}
            </span>
            <ArrowRight className="size-3.5 shrink-0 text-brand transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>
          )}
        </div>

        <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:duration-700 lg:col-span-5">
          <ResearchNetwork />
        </div>
      </div>
    </section>
  );
}
