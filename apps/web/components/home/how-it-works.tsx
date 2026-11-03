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
    <section aria-labelledby="how-heading" className="border-t border-rule bg-surface py-16 md:py-20 lg:py-24">
      <div className="container-site grid gap-10 lg:grid-cols-12 lg:items-center lg:gap-14">
        <div className="lg:col-span-5">
          <h2 id="how-heading" className="font-serif text-h2 font-normal text-ink">
            How It Works
          </h2>
          <p className="mt-4 text-[1.0625rem] leading-relaxed text-muted-ink">A short introduction to the RiTECHS research community and how members work together.</p>
          <ol className="mt-8 space-y-5">
            {steps.map((s, i) => (
              <li key={s.title} className="flex gap-4">
                <span aria-hidden className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-wash font-serif text-lg text-brand numerals-tabular">
                  {i + 1}
                </span>
                <span>
                  <span className="block font-medium text-ink">{s.title}</span>
                  <span className="mt-0.5 block text-[0.9375rem] text-muted-ink">{s.text}</span>
                </span>
              </li>
            ))}
          </ol>
          <Link href={routes.register} className="tap-target mt-8 inline-flex items-center gap-1.5 rounded-sm text-[0.9375rem] font-medium text-brand hover:underline">
            Join the Community <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
        <div className="lg:col-span-7">
          <div className="overflow-hidden rounded-lg border border-rule bg-brand-deep shadow-[0_24px_48px_-32px_rgba(32,33,36,0.5)]">
            <video className="aspect-video w-full" controls preload="none" poster={legacyAsset(POSTER)} aria-label="Introduction to RiTECHS">
              <source src={legacyAsset(VIDEO)} type="video/mp4" />
              <a href={legacyAsset(VIDEO)}>Watch the introduction video</a>
            </video>
          </div>
        </div>
      </div>
    </section>
  );
}
