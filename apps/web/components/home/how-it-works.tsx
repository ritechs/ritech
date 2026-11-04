import { Reveal } from "@/components/home/reveal";
import { SectionHeading } from "@/components/home/section-heading";
import { legacyAsset } from "@/lib/assets";
import { routes } from "@/lib/site";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

/** The introduction video from the old site (files under uploads/, copied by `legacy:assets`). */
const VIDEO = "uploads/1636987699.mp4";
const POSTER = "uploads/1638943501.png";

const steps = [
  { title: "Join", text: "Register as a mentor or a mentee. Our team reviews every application." },
  { title: "Connect", text: "Find a mentor by research area and request mentorship from their profile." },
  { title: "Grow", text: "Take part in conferences, seminars and training, and publish your research." },
];

export function HowItWorks() {
  return (
    <section aria-labelledby="how-heading" className="bg-surface py-16 md:py-20 lg:py-24">
      <div className="container-site grid gap-10 lg:grid-cols-12 lg:items-center lg:gap-14">
        <div className="lg:col-span-5">
          <SectionHeading
            id="how-heading"
            title="How It Works"
            description="A short introduction to the RiTECHS research community and how members work together."
          />
          <ol className="mt-8 space-y-5">
            {steps.map((s, i) => (
              <li key={s.title} className="flex gap-4">
                <span aria-hidden className="inline-flex size-10 shrink-0 items-center justify-center bg-brand font-headline text-lg font-semibold text-white numerals-tabular">
                  {i + 1}
                </span>
                <span>
                  <span className="block font-semibold text-ink">{s.title}</span>
                  <span className="mt-0.5 block text-[0.9375rem] text-muted-ink">{s.text}</span>
                </span>
              </li>
            ))}
          </ol>
          <Link href={routes.register} className="tap-target mt-8 inline-flex items-center gap-1.5 rounded-sm border-b-2 border-brand-tint text-[0.9375rem] font-semibold text-brand hover:border-brand">
            Join the Community <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
        <Reveal fade className="lg:col-span-7">
          <div className="overflow-hidden border-[6px] border-brand bg-brand-deep shadow-[0_24px_48px_-28px_rgb(0_0_0/0.55)]">
            <video className="aspect-video w-full" controls preload="none" poster={legacyAsset(POSTER)} aria-label="Introduction to RiTECHS">
              <source src={legacyAsset(VIDEO)} type="video/mp4" />
              <a href={legacyAsset(VIDEO)}>Watch the introduction video</a>
            </video>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
