"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/site";

/** "Start your journey": pick what you want to do, then go to that part of the site. */
const steps = [
  { label: "I want to explore publications", href: routes.publications },
  { label: "I am looking for a mentor", href: routes.mentorship },
  { label: "I want to join as a mentee", href: routes.registerMentee },
  { label: "I want to become a mentor", href: routes.registerMentor },
  { label: "I want to attend a conference", href: routes.conferences },
  { label: "I need publication support", href: "/publication" },
  { label: "I want research training", href: "/eLearning" },
];

export function JourneyStrip() {
  const router = useRouter();
  const [choice, setChoice] = useState("");
  const [error, setError] = useState(false);

  return (
    <section aria-label="Start your journey" className="relative bg-brand bg-stripes text-white">
      <form
        className="container-site flex flex-col items-stretch justify-center gap-3 py-6 sm:flex-row sm:flex-wrap sm:items-center sm:gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (!choice) {
            setError(true);
            document.getElementById("journey-step")?.focus();
            return;
          }
          router.push(choice);
        }}
      >
        <label htmlFor="journey-step" className="text-center text-lg font-medium sm:text-left">
          Start your journey:
        </label>
        <div className="relative sm:w-[22rem]">
          <select
            id="journey-step"
            name="step"
            value={choice}
            aria-invalid={error || undefined}
            aria-describedby={error ? "journey-error" : undefined}
            onChange={(e) => {
              setChoice(e.target.value);
              setError(false);
            }}
            className="h-12 w-full appearance-none rounded-sm border-2 border-white/80 bg-black/15 pr-11 pl-4 font-headline text-[1.0625rem] font-medium tracking-[0.03em] text-white uppercase outline-none focus-visible:border-highlight aria-invalid:border-highlight [&>option]:bg-surface [&>option]:font-sans [&>option]:text-ink [&>option]:normal-case"
          >
            <option value="" disabled>
              Choose your next step
            </option>
            {steps.map((s) => (
              <option key={s.href} value={s.href}>
                {s.label}
              </option>
            ))}
          </select>
          <ChevronDown aria-hidden className="pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2" />
        </div>
        <Button type="submit" variant="highlight" size="lg" className="rounded-sm">
          Get Started <ArrowRight aria-hidden />
        </Button>
        {error && (
          <p id="journey-error" role="alert" className="w-full text-center text-sm text-highlight">
            Choose what you would like to do first.
          </p>
        )}
      </form>
    </section>
  );
}
