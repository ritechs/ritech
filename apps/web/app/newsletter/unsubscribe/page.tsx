import type { Metadata } from "next";
import { Suspense } from "react";
import { NewsletterToken } from "@/components/account/newsletter-token";
import { PageHeader } from "@/components/page/page-header";

export const metadata: Metadata = { title: "Unsubscribe", robots: { index: false }, referrer: "no-referrer" };

export default function Page() {
  return (
    <main id="main" className="flex-1">
      <PageHeader title="Unsubscribe" crumbs={[{ label: "Home", href: "/" }, { label: "Newsletter" }]} />
      <div className="container-site max-w-2xl py-10 md:py-14">
        <Suspense>
          <NewsletterToken action="unsubscribe" />
        </Suspense>
      </div>
    </main>
  );
}
