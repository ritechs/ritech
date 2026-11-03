import Link from "next/link";
import { NewsletterForm } from "@/components/layout/newsletter-form";
import { routes } from "@/lib/site";

export function NewsletterCta() {
  return (
    <section aria-labelledby="newsletter-heading" className="bg-brand-deep text-white">
      <div className="container-site grid gap-10 py-16 md:py-20 lg:grid-cols-12 lg:items-center lg:gap-12 lg:py-24">
        <div className="lg:col-span-6">
          <h2 id="newsletter-heading" className="max-w-[20ch] font-serif text-h2 font-normal [text-wrap:balance]">
            Be Part of the Next Generation of Research.
          </h2>
          <p className="mt-4 max-w-lg text-[1.0625rem] leading-relaxed text-white/75">
            Get calls for papers, conference dates and new publications by email, about once a month. Prefer to get
            involved now?{" "}
            <Link href={routes.register} className="rounded-sm text-white underline decoration-white/40 underline-offset-4 hover:decoration-white">
              Create an account
            </Link>
            .
          </p>
        </div>
        <div className="lg:col-span-6 lg:col-start-7">
          <NewsletterForm />
        </div>
      </div>
    </section>
  );
}
